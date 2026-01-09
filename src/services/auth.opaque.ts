import { client } from '@serenity-kit/opaque';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { SdkFactory } from 'app/core/factory/sdk';
import localStorageService from 'services/local-storage.service';
import { computeMac } from 'internxt-crypto/hash';

import { RegisterOpaqueDetails } from '@internxt/sdk';
import { readReferalCookie } from './auth.service';
import {
  decryptUserKeysAndMnemonic,
  encryptUserKeysAndMnemonic,
  encryptSessionKey,
  decryptSessionKey,
  generateUserSecrets,
  safeBase64ToBytes,
} from './auth.crypto';
import { base64ToUint8Array, uuidToBytes } from 'internxt-crypto/utils';

import { ProfileInfoOpaque, OpaqueLoginError } from './auth.opaque.types';

export const loginOpaque = async (
  email: string,
  password: string,
  twoFactorCode: string,
): Promise<ProfileInfoOpaque> => {
  const authClient = SdkFactory.getNewApiInstance().createAuthClient();
  const { clientLoginState, startLoginRequest } = client.startLogin({
    password,
  });

  const { loginResponse } = await authClient.loginOpaqueStart(email, startLoginRequest);
  const { user, sessionID, sessionKey, exportKey, token } = await finishOpaqueLogin(
    clientLoginState,
    loginResponse,
    password,
    email,
    twoFactorCode,
  );

  return { user, sessionID, sessionKey, exportKey, token };
};

export const doLoginOpaque = async (
  email: string,
  password: string,
  twoFactorCode: string,
): Promise<{ token: string; user: UserSettings; mnemonic: string; newToken: string }> => {
  console.time(`TIMER: doLoginOpaque for ${email}`);
  const {
    sessionID,
    user: loggedUser,
    sessionKey,
    exportKey,
    token,
  } = await loginOpaque(email, password, twoFactorCode);

  const { keys, mnemonic } = await decryptUserKeysAndMnemonic(loggedUser.mnemonic, loggedUser.keys, exportKey);

  const user = {
    ...loggedUser,
    mnemonic,
    privateKey: keys.ecc.privateKey,
    keys,
  };

  localStorageService.set('xMnemonic', mnemonic);
  localStorageService.set('xNewToken', token);
  localStorageService.set('sessionID', sessionID);
  await setSessionKey(password, sessionKey);
  console.timeEnd(`TIMER: doLoginOpaque for ${email}`);

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

  const { user, sessionID, sessionKey, token } = await finishOpaqueLogin(
    clientLoginState,
    loginResponse,
    password,
    email,
    '',
  );

  return { user, sessionID, sessionKey, mnemonic, exportKey, token };
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
  localStorageService.setSessionKey(sessionKeyEnc, salt);
};

export const getSessionKey = async (password: string): Promise<Uint8Array> => {
  const sessionKeyEnc = localStorageService.getSessionKey() || '';
  const salt = localStorageService.getSessionKeySalt() || '';
  return decryptSessionKey(password, sessionKeyEnc, salt);
};

export const getMac = async (password: string, request: Uint8Array[]): Promise<string> => {
  const sessionKey = await getSessionKey(password);
  return computeMac(sessionKey, request);
};

const finishOpaqueLogin = async (
  clientLoginState: string,
  loginResponse: string,
  password: string,
  email: string,
  twoFactorCode: string,
) => {
  const loginResult = client.finishLogin({
    clientLoginState,
    loginResponse,
    password,
  });
  if (!loginResult) {
    throw new OpaqueLoginError();
  }
  const { finishLoginRequest, sessionKey, exportKey } = loginResult;
  const authClient = SdkFactory.getNewApiInstance().createAuthClient();
  const { sessionID, user, token } = await authClient.loginOpaqueFinish(email, finishLoginRequest, twoFactorCode);

  return { exportKey, sessionID, sessionKey, user, token };
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
    uuidToBytes(sessionID),
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
    '',
  );

  return { exportKey, sessionID: newSessionID, sessionKey: newSessionKey };
};

export const changePasswordOpaque = async (newPassword: string, currentPassword: string): Promise<void> => {
  const currentSessionID = localStorageService.get('xNewToken') || '';
  const { sessionID, sessionKey } = await doChangePasswordOpaque(newPassword, currentPassword, currentSessionID);
  await setSessionKey(newPassword, sessionKey);
  localStorageService.set('xNewToken', sessionID);
};
