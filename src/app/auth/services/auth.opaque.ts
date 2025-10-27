import * as opaque from '@serenity-kit/opaque';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { SdkFactory } from '../../core/factory/sdk';
import * as Sentry from '@sentry/react';
import localStorageService from 'app/core/services/local-storage.service';
import { hash } from 'internxt-crypto';

import { RegisterOpaqueDetails } from '@internxt/sdk';
import { readReferalCookie } from 'app/auth/services/auth.service';
import {
  decryptUserKeysAndMnemonic,
  encryptUserKeysAndMnemonic,
  encryptSessionKey,
  decryptSessionKey,
  generateUserSecrets,
} from './auth.crypto';

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
  const { clientLoginState, startLoginRequest } = opaque.client.startLogin({
    password,
  });

  const { loginResponse } = await authClient.loginOpaqueStart(email, startLoginRequest, twoFactorCode);
  const loginResult = opaque.client.finishLogin({
    clientLoginState,
    loginResponse,
    password,
  });
  if (!loginResult) {
    throw new Error('Login failed');
  }
  const { exportKey, finishLoginRequest, sessionKey } = loginResult;
  const { user, sessionID } = await authClient.loginOpaqueFinish(email, finishLoginRequest);

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
  const { clientRegistrationState, registrationRequest } = opaque.client.startRegistration({ password });
  const authClient = SdkFactory.getNewApiInstance().createAuthClient();
  const { signUpResponse } = await authClient.registerOpaqueStart(email, registrationRequest);

  const { exportKey, registrationRecord } = opaque.client.finishRegistration({
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

  const { clientLoginState, startLoginRequest } = opaque.client.startLogin({
    password,
  });

  const { loginResponse } = await authClient.registerOpaqueFinish(
    registrationRecord,
    registerDetails,
    startLoginRequest,
  );
  const loginResult = opaque.client.finishLogin({
    clientLoginState,
    loginResponse,
    password,
  });
  if (!loginResult) {
    throw new Error('Login failed');
  }
  const { finishLoginRequest, sessionKey } = loginResult;
  const { user, sessionID } = await authClient.loginOpaqueFinish(email, finishLoginRequest);

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

export const getSessionKey = async (password: string): Promise<string> => {
  const sessionKeyEnc = localStorageService.get('sessionKey') || '';
  const salt = localStorageService.get('sessionKeySalt') || '';
  return decryptSessionKey(password, sessionKeyEnc, salt);
};

export const getMac = async (password: string, request: string[]): Promise<string> => {
  const sessionKey = await getSessionKey(password);
  return hash.computeMac(sessionKey, request);
};

export const deactivate2FAOpaque = async (password: string, authCode: string): Promise<void> => {
  const sessionID = localStorageService.get('xNewToken') || '';
  const mac = await getMac(password, [authCode, sessionID]);

  const authClient = SdkFactory.getNewApiInstance().createAuthClient();
  return authClient.disableTwoFactorAuth(mac, authCode, sessionID);
};

export const doChangePasswordOpaque = async (newPassword: string, currentPassword: string, sessionID: string) => {
  const { clientRegistrationState, registrationRequest } = opaque.client.startRegistration({ password: newPassword });

  const mac = await getMac(currentPassword, [registrationRequest, sessionID]);

  const usersClient = SdkFactory.getNewApiInstance().createUsersClient();

  const { registrationResponse } = await usersClient.changePwdOpaqueStart(mac, sessionID, registrationRequest);
  const { exportKey, registrationRecord: newRegistrationRecord } = opaque.client.finishRegistration({
    clientRegistrationState,
    registrationResponse,
    password: newPassword,
  });

  const user = localStorageService.getUser() as UserSettings;
  const { encKeys, encMnemonic } = await encryptUserKeysAndMnemonic(user.keys, user.mnemonic, exportKey);

  const { clientLoginState, startLoginRequest } = opaque.client.startLogin({
    password: newPassword,
  });

  const mac_new = await getMac(currentPassword, [
    newRegistrationRecord,
    encMnemonic,
    JSON.stringify(encKeys),
    startLoginRequest,
  ]);

  const { loginResponse } = await usersClient.changePwdOpaqueFinish(
    mac_new,
    sessionID,
    newRegistrationRecord,
    encMnemonic,
    encKeys,
    startLoginRequest,
  );

  const loginResult = opaque.client.finishLogin({
    clientLoginState,
    loginResponse,
    password: newPassword,
  });
  if (!loginResult) {
    throw new Error('Login failed');
  }
  const { finishLoginRequest, sessionKey: newSessionKey } = loginResult;
  const authClient = SdkFactory.getNewApiInstance().createAuthClient();

  const { sessionID: new_sessionID } = await authClient.loginOpaqueFinish(user.email, finishLoginRequest);

  return { exportKey, sessionID: new_sessionID, sessionKey: newSessionKey };
};

export const changePasswordOpaque = async (newPassword: string, currentPassword: string): Promise<void> => {
  const sessionID = localStorageService.get('xNewToken') || '';
  const {
    exportKey,
    sessionID: newSessionID,
    sessionKey: newSessionKey,
  } = await doChangePasswordOpaque(newPassword, currentPassword, sessionID);
  await setSessionKey(newPassword, newSessionKey);
  localStorageService.set('xNewToken', newSessionID);
  localStorageService.set('exportKey', exportKey);
};
