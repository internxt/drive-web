import * as opaque from '@serenity-kit/opaque';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { ProfileInfoOpaque, SignUpParamsOpaque, LogInParamsOpaque } from './auth.types';
import { initializeUserThunk, userActions, userThunks } from 'app/store/slices/user';
import { productsThunks } from 'app/store/slices/products';
import { referralsThunks } from 'app/store/slices/referrals';
import { planThunks } from 'app/store/slices/plan';
import { workspaceThunks } from 'app/store/slices/workspaces/workspacesStore';
import { SdkFactory } from '../../core/factory/sdk';
import * as Sentry from '@sentry/react';
import { symmetric, utils, derive } from 'internxt-crypto';
import localStorageService from 'app/core/services/local-storage.service';
import { trackSignUp } from 'app/analytics/impact.service';
import * as bip39 from 'bip39';
import { generateNewKeys } from 'app/crypto/services/pgp.service';
import { RegisterOpaqueDetails, UserKeys } from '@internxt/sdk';
import { readReferalCookie } from 'app/auth/services/auth.service';
import { getHmacSha512 } from 'app/crypto/services/utils';
import { generateCaptchaToken } from 'app/utils/generateCaptchaToken';

async function encryptUserKeysAndMnemonic(
  userKeys: UserKeys,
  mnemonic: string,
  exportKey: string,
): Promise<{ encMnemonic: string; encKeys: UserKeys }> {
  const keyArray = utils.base64ToUint8Array(exportKey);
  const cryptoKey = await symmetric.importSymmetricCryptoKey(keyArray);
  const encPrivateKey = await symmetric.encryptSymmetrically(cryptoKey, userKeys.ecc.privateKey, 'user-private-key');
  const encPrivateKyberKey = await symmetric.encryptSymmetrically(
    cryptoKey,
    userKeys.kyber.privateKey,
    'user-private-kyber-key',
  );
  const encMnemonic = await symmetric.encryptSymmetrically(cryptoKey, mnemonic, 'user-mnemonic');

  const encKeys: UserKeys = {
    ecc: {
      privateKey: encPrivateKey,
      publicKey: userKeys.ecc.publicKey,
    },
    kyber: {
      privateKey: encPrivateKyberKey,
      publicKey: userKeys.kyber.publicKey,
    },
  };
  return { encMnemonic, encKeys };
}

async function decryptUserKeysAndMnemonic(
  encMnemonic: string,
  encKeys: UserKeys,
  key: string,
): Promise<{ keys: UserKeys; clearMnemonic: string }> {
  const keyArray = utils.base64ToUint8Array(key);
  const cryptoKey = await symmetric.importSymmetricCryptoKey(keyArray);
  const privateKey = await symmetric.decryptSymmetrically(cryptoKey, encKeys.ecc.privateKey, 'user-private-key');
  const privateKyberKey = await symmetric.decryptSymmetrically(
    cryptoKey,
    encKeys.kyber.privateKey,
    'user-private-kyber-key',
  );
  const clearMnemonic = await symmetric.decryptSymmetrically(cryptoKey, encMnemonic, 'user-mnemonic');

  const keys: UserKeys = {
    ecc: {
      privateKey: privateKey,
      publicKey: encKeys.ecc.publicKey,
    },
    kyber: {
      privateKey: privateKyberKey,
      publicKey: encKeys.kyber.publicKey,
    },
  };
  return { keys, clearMnemonic };
}

export const logInOpaque = async (params: LogInParamsOpaque): Promise<ProfileInfoOpaque> => {
  const { email, password, twoFactorCode, dispatch } = params;
  const authClient = SdkFactory.getNewApiInstance().createAuthClient();
  const { clientLoginState, startLoginRequest } = opaque.client.startLogin({
    password,
  });

  const { loginResponse } = await authClient.loginOpaqueStart(email, startLoginRequest, twoFactorCode);
  const loginResult = opaque.client.finishLogin({
    clientLoginState,
    loginResponse,
    password,
    keyStretching: 'memory-constrained',
  });
  if (!loginResult) {
    throw new Error('Login failed');
  }
  const { exportKey, finishLoginRequest, sessionKey } = loginResult;
  const data = await authClient.loginOpaqueFinish(email, finishLoginRequest);
  const { user, token } = data;

  const { keys, clearMnemonic } = await decryptUserKeysAndMnemonic(user.mnemonic, user.keys, exportKey);
  Sentry.setUser({
    id: user.uuid,
    email: user.email,
    sharedWorkspace: user.sharedWorkspace,
  });

  const clearUser = {
    ...user,
    mnemonic: clearMnemonic,
    privateKey: keys.ecc.privateKey,
    keys,
  };

  localStorageService.set('xMnemonic', clearMnemonic);
  localStorageService.set('xNewToken', token);
  await setSessionKey(password, sessionKey);

  dispatch(userActions.setUser(clearUser));

  try {
    dispatch(productsThunks.initializeThunk());
    dispatch(planThunks.initializeThunk());
    dispatch(referralsThunks.initializeThunk());
    await dispatch(initializeUserThunk())?.unwrap();
    dispatch(workspaceThunks.fetchWorkspaces());
    dispatch(workspaceThunks.checkAndSetLocalWorkspace());
  } catch (e: unknown) {
    const error = e as Error;

    throw new Error(error.message);
  }

  userActions.setUser(clearUser);

  return { token, user: clearUser, mnemonic: clearMnemonic };
};

export const signUpOpaque = async (params: SignUpParamsOpaque) => {
  const { email, password, redeemCodeObject, dispatch } = params;
  const { clientRegistrationState, registrationRequest } = opaque.client.startRegistration({ password });
  const authClient = SdkFactory.getNewApiInstance().createAuthClient();
  const response = await authClient.registerOpaqueStart(email, registrationRequest);

  const { exportKey, registrationRecord } = opaque.client.finishRegistration({
    clientRegistrationState,
    registrationResponse: response.signUpResponse,
    password,
  });
  const clearMnemonic = bip39.generateMnemonic(256);
  const { privateKeyArmored, publicKeyArmored, publicKyberKeyBase64, privateKyberKeyBase64 } = await generateNewKeys();
  const keys: UserKeys = {
    ecc: { privateKey: privateKeyArmored, publicKey: publicKeyArmored },
    kyber: {
      privateKey: privateKyberKeyBase64,
      publicKey: publicKyberKeyBase64,
    },
  };
  const { encKeys, encMnemonic } = await encryptUserKeysAndMnemonic(keys, clearMnemonic, exportKey);
  const authCaptcha = await generateCaptchaToken();
  const registerDetails: RegisterOpaqueDetails = {
    name: 'My',
    lastname: 'Internxt',
    email: email.toLowerCase(),
    keys: encKeys,
    mnemonic: encMnemonic,
    referral: readReferalCookie(),
    captcha: authCaptcha,
    referrer: '',
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
    keyStretching: 'memory-constrained',
  });
  if (!loginResult) {
    throw new Error('Login failed');
  }
  const { finishLoginRequest, sessionKey } = loginResult;
  const data = await authClient.loginOpaqueFinish(email, finishLoginRequest);
  const { user: xUser, token: newToken } = data;
  await setSessionKey(password, sessionKey);

  localStorageService.clear();
  localStorageService.set('xMnemonic', clearMnemonic);
  localStorageService.set('xNewToken', newToken);

  const user = {
    ...xUser,
    privateKey: keys.ecc.privateKey,
    keys,
  } as UserSettings;

  dispatch(userActions.setUser(user));
  await dispatch(userThunks.initializeUserThunk());
  dispatch(productsThunks.initializeThunk());

  if (!redeemCodeObject) dispatch(planThunks.initializeThunk());
  dispatch(referralsThunks.initializeThunk());
  await trackSignUp(xUser.uuid);

  return { token: newToken, user: xUser, mnemonic: clearMnemonic };
};

const setSessionKey = async (password: string, sessionKey: string): Promise<void> => {
  const { key, salt } = await derive.getKeyFromPassword(password);
  const cryptoKey = await symmetric.importSymmetricCryptoKey(key);
  const sessionKeyEnc = await symmetric.encryptSymmetrically(cryptoKey, sessionKey, 'UserSessionKey');
  localStorageService.set('sessionKey', sessionKeyEnc);
  localStorageService.set('sessionKeySalt', salt);
};

const getSessionKey = async (password: string): Promise<string> => {
  const sessionKeyEnc = localStorageService.get('sessionKey') || '';
  const salt = localStorageService.get('sessionKeySalt') || '';
  const keyBytes = await derive.getKeyFromPasswordAndSalt(password, salt);
  const key = await symmetric.importSymmetricCryptoKey(keyBytes);
  return symmetric.decryptSymmetrically(key, sessionKeyEnc, 'UserSessionKey');
};

const getPasswordProof = async (password: string, purpose: string[]): Promise<string> => {
  const sessionKey = await getSessionKey(password);
  return getHmacSha512(sessionKey, purpose);
};

export const deactivate2FAOpaque = async (password: string, authCode: string): Promise<void> => {
  const token = localStorageService.get('xNewToken') || undefined;
  const proof = await getPasswordProof(password, ['deactivate2FA', authCode]);

  const authClient = SdkFactory.getNewApiInstance().createAuthClient();
  return authClient.disableTwoFactorAuth(proof, authCode, token);
};

export const changePasswordOpaque = async (newPassword: string, currentPassword: string): Promise<void> => {
  const { clientRegistrationState, registrationRequest } = opaque.client.startRegistration({ password: newPassword });

  const proof = await getPasswordProof(currentPassword, ['change-password-start', registrationRequest]);

  const usersClient = SdkFactory.getNewApiInstance().createUsersClient();
  const { registrationResponse } = await usersClient.changePwdOpaqueStart(proof, registrationRequest);
  const { exportKey, registrationRecord: newRegistrationRecord } = opaque.client.finishRegistration({
    clientRegistrationState,
    registrationResponse,
    password: newPassword,
  });

  const user = localStorageService.getUser() as UserSettings;
  const { encKeys, encMnemonic } = await encryptUserKeysAndMnemonic(user.keys, user.mnemonic, exportKey);

  const proof_new = await getPasswordProof(currentPassword, ['change-password-finish', newRegistrationRecord, proof]);
  const { clientLoginState, startLoginRequest } = opaque.client.startLogin({
    password: newPassword,
  });

  const { loginResponse } = await usersClient.changePwdOpaqueFinish(
    proof_new,
    newRegistrationRecord,
    encMnemonic,
    encKeys,
    startLoginRequest,
  );

  const loginResult = opaque.client.finishLogin({
    clientLoginState,
    loginResponse,
    password: newPassword,
    keyStretching: 'memory-constrained',
  });
  if (!loginResult) {
    throw new Error('Login failed');
  }
  const { finishLoginRequest, sessionKey: newSessionKey } = loginResult;
  await setSessionKey(newPassword, newSessionKey);
  const authClient = SdkFactory.getNewApiInstance().createAuthClient();
  const { token } = await authClient.loginOpaqueFinish(user.email, finishLoginRequest);
  localStorageService.set('xNewToken', token);
};
