import { client } from '@serenity-kit/opaque';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { SdkFactory } from '../../core/factory/sdk';
import * as Sentry from '@sentry/react';
import localStorageService from 'app/core/services/local-storage.service';
import { computeMac } from 'internxt-crypto/hash';

import { RegisterOpaqueDetails } from '@internxt/sdk';
import { readReferalCookie } from 'app/auth/services/auth.service';
import {
  decryptUserKeysAndMnemonic,
  encryptUserKeysAndMnemonic,
  encryptSessionKey,
  decryptSessionKey,
  generateUserSecrets,
  safeBase64ToBytes,
} from './auth.crypto';
import { base64ToUint8Array, uuidToBytes } from 'internxt-crypto/utils';

export type ProfileInfoOpaque = {
  user: UserSettings;
  sessionID: string;
  sessionKey: string;
  exportKey: string;
};

export const loginOpaque = async (
  email: string,
  password: string,
  twoFactorCode: string,
): Promise<ProfileInfoOpaque> => {
  const authClient = SdkFactory.getNewApiInstance().createAuthClient();
  const { clientLoginState, startLoginRequest } = client.startLogin({
    password,
  });

  const { loginResponse } = await authClient.loginOpaqueStart(email, startLoginRequest, twoFactorCode);
  const { user, sessionID, sessionKey, exportKey } = await finishOpaqueLogin(
    clientLoginState,
    loginResponse,
    password,
    email,
  );

  return { user, sessionID, sessionKey, exportKey };
};

export const doLoginOpaque = async (
  email: string,
  password: string,
  twoFactorCode: string,
): Promise<{ token: string; user: UserSettings; mnemonic: string; newToken: string }> => {
  const { sessionID, user: encUser, sessionKey, exportKey } = await loginOpaque(email, password, twoFactorCode);

  const { keys, mnemonic } = await decryptUserKeysAndMnemonic(encUser.mnemonic, encUser.keys, exportKey);

  const user = {
    ...encUser,
    mnemonic,
    privateKey: keys.ecc.privateKey,
    keys,
  };

  localStorageService.set('xMnemonic', mnemonic);
  localStorageService.set('xNewToken', sessionID);
  await setSessionKey(password, sessionKey);

  Sentry.setUser({
    id: user.uuid,
    email: user.email,
    sharedWorkspace: user.sharedWorkspace,
  });

  return { token: sessionID, user, mnemonic, newToken: sessionID };
};

export const signupOpaque = async (
  email: string,
  password: string,
  captcha: string,
  referrer: string,
  referral: string,
) => {
  const { clientRegistrationState, registrationRequest } = client.startRegistration({ password });
  const authClient = SdkFactory.getNewApiInstance().createAuthClient();
  const { signUpResponse } = await authClient.registerOpaqueStart(email, registrationRequest);

  const { exportKey, registrationRecord } = client.finishRegistration({
    clientRegistrationState,
    registrationResponse: signUpResponse,
    password,
  });
  const { keys, mnemonic } = await generateUserSecrets();
  const { encKeys, encMnemonic } = await encryptUserKeysAndMnemonic(keys, mnemonic, exportKey);

  const registerDetails: RegisterOpaqueDetails = {
    name: 'My',
    lastname: 'Internxt',
    email: email.toLowerCase(),
    keys: encKeys,
    mnemonic: encMnemonic,
    referral,
    captcha,
    referrer,
  };

  const { clientLoginState, startLoginRequest } = client.startLogin({
    password,
  });

  const { loginResponse } = await authClient.registerOpaqueFinish(
    registrationRecord,
    registerDetails,
    startLoginRequest,
  );

  const { user, sessionID, sessionKey } = await finishOpaqueLogin(clientLoginState, loginResponse, password, email);

  return { user, sessionID, sessionKey, mnemonic, exportKey };
};

export const doSignUpOpaque = async (email: string, password: string, captcha: string) => {
  const referrer = '';
  const referral = readReferalCookie() ?? '';

  const {
    user: xUser,
    sessionID,
    sessionKey,
    mnemonic,
  } = await signupOpaque(email, password, captcha, referrer, referral);

  await setSessionKey(password, sessionKey);

  return { xToken: sessionID, xUser, mnemonic, xNewToken: sessionID };
};

export const setSessionKey = async (password: string, sessionKey: string): Promise<void> => {
  const { sessionKeyEnc, salt } = await encryptSessionKey(password, sessionKey);
  localStorageService.set('sessionKey', sessionKeyEnc);
  localStorageService.set('sessionKeySalt', salt);
};

export const getSessionKey = async (password: string): Promise<Uint8Array> => {
  const sessionKeyEnc = localStorageService.get('sessionKey') || '';
  const salt = localStorageService.get('sessionKeySalt') || '';
  return decryptSessionKey(password, sessionKeyEnc, salt);
};

export const getMac = async (password: string, request: Uint8Array[]): Promise<string> => {
  const sessionKey = await getSessionKey(password);
  return computeMac(sessionKey, request);
};

export const deactivate2FAOpaque = async (password: string, authCode: string): Promise<void> => {
  const sessionID = localStorageService.get('xNewToken') || '';
  const mac = await getMac(password, [Buffer.from(authCode), uuidToBytes(sessionID)]);

  const authClient = SdkFactory.getNewApiInstance().createAuthClient();
  return authClient.disableTwoFactorAuth(mac, authCode, sessionID);
};

const finishOpaqueLogin = async (clientLoginState: string, loginResponse: string, password: string, email: string) => {
  const loginResult = client.finishLogin({
    clientLoginState,
    loginResponse,
    password,
  });
  if (!loginResult) {
    throw new Error('Login failed');
  }
  const { finishLoginRequest, sessionKey, exportKey } = loginResult;
  const authClient = SdkFactory.getNewApiInstance().createAuthClient();
  const { sessionID, user } = await authClient.loginOpaqueFinish(email, finishLoginRequest);

  return { exportKey, sessionID, sessionKey, user };
};

export const doChangePasswordOpaque = async (newPassword: string, currentPassword: string, sessionID: string) => {
  const { clientRegistrationState, registrationRequest } = client.startRegistration({ password: newPassword });

  const mac = await getMac(currentPassword, [safeBase64ToBytes(registrationRequest), uuidToBytes(sessionID)]);

  const usersClient = SdkFactory.getNewApiInstance().createUsersClient();

  const { registrationResponse } = await usersClient.changePwdOpaqueStart(mac, sessionID, registrationRequest);
  const { exportKey, registrationRecord: newRegistrationRecord } = client.finishRegistration({
    clientRegistrationState,
    registrationResponse,
    password: newPassword,
  });

  const user = localStorageService.getUser() as UserSettings;
  const { encKeys, encMnemonic } = await encryptUserKeysAndMnemonic(user.keys, user.mnemonic, exportKey);

  const { clientLoginState, startLoginRequest } = client.startLogin({
    password: newPassword,
  });

  const macNew = await getMac(currentPassword, [
    safeBase64ToBytes(newRegistrationRecord),
    base64ToUint8Array(encMnemonic),
    base64ToUint8Array(encKeys.ecc.privateKey),
    base64ToUint8Array(encKeys.ecc.publicKey),
    base64ToUint8Array(encKeys.kyber.privateKey),
    base64ToUint8Array(encKeys.kyber.publicKey),
    safeBase64ToBytes(startLoginRequest),
  ]);

  const { loginResponse } = await usersClient.changePwdOpaqueFinish(
    macNew,
    sessionID,
    newRegistrationRecord,
    encMnemonic,
    encKeys,
    startLoginRequest,
  );

  const { sessionID: newSessionID, sessionKey: newSessionKey } = await finishOpaqueLogin(
    clientLoginState,
    loginResponse,
    newPassword,
    user.email,
  );

  return { exportKey, sessionID: newSessionID, sessionKey: newSessionKey };
};

export const changePasswordOpaque = async (newPassword: string, currentPassword: string): Promise<void> => {
  const currentSessionID = localStorageService.get('xNewToken') || '';
  const { sessionID, sessionKey } = await doChangePasswordOpaque(newPassword, currentPassword, currentSessionID);
  await setSessionKey(newPassword, sessionKey);
  localStorageService.set('xNewToken', sessionID);
};
