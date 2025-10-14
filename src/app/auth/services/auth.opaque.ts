import * as opaque from '@serenity-kit/opaque';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { ProfileInfo, SignUpParams, LogInParams, AuthenticateUserParams } from './auth.types';
import { initializeUserThunk, userActions, userThunks } from 'app/store/slices/user';
import { productsThunks } from 'app/store/slices/products';
import { referralsThunks } from 'app/store/slices/referrals';
import { planThunks } from 'app/store/slices/plan';
import { workspaceThunks } from 'app/store/slices/workspaces/workspacesStore';
import { SdkFactory } from '../../core/factory/sdk';
import * as Sentry from '@sentry/react';
import { symmetric, utils } from 'internxt-crypto';
import localStorageService from 'app/core/services/local-storage.service';
import { trackSignUp } from 'app/analytics/impact.service';
import * as bip39 from 'bip39';
import { generateNewKeys } from 'app/crypto/services/pgp.service';
import { RegisterOpaqueDetails, UserKeys } from '@internxt/sdk';
import { readReferalCookie } from 'app/auth/services/auth.service';

export const authenticateUserOpaque = async (params: AuthenticateUserParams): Promise<ProfileInfo> => {
  const {
    email,
    password,
    authMethod,
    twoFactorCode,
    dispatch,
    loginType = 'web',
    token = '',
    redeemCodeObject = false,
    doSignUp,
  } = params;
  if (authMethod === 'signIn') {
    const profileInfo = await logInOpaque({ email, password, twoFactorCode, dispatch, loginType });
    window.gtag('event', 'User Signin', { method: 'email' });
    return profileInfo;
  } else if (authMethod === 'signUp' && doSignUp) {
    const profileInfo = await signUpOpaque({ doSignUp, email, password, token, redeemCodeObject, dispatch });
    return profileInfo;
  } else {
    throw new Error(`Unknown authMethod: ${authMethod}`);
  }
};


export async function encryptUserKeysAndMnemonic(userKeys: UserKeys, mnemonic: string, exportKey: string): Promise<{encMnemonic: string, encKeys: UserKeys}> {
 
  const keyArray = utils.base64ToUint8Array(exportKey);
  const cryptoKey = await symmetric.importSymmetricCryptoKey(keyArray);
  const encPrivateKey = await symmetric.encryptSymmetrically(cryptoKey, userKeys.privateKey, 'user-private-key');
  const encPrivateKyberKey =  await symmetric.encryptSymmetrically(cryptoKey, userKeys.privateKyberKey, 'user-private-kyber-key');
  const encMnemonic =  await symmetric.encryptSymmetrically(cryptoKey, mnemonic, 'user-mnemonic');
 
  const encKeys: UserKeys = {
      privateKey: encPrivateKey,
      publicKey: userKeys.publicKey,
      privateKyberKey: encPrivateKyberKey,
      publicKyberKey: userKeys.publicKyberKey,
  };
  return { encMnemonic, encKeys};
}

async function decryptUserKeysAndMnemonic(
  encMnemonic: string,
  encKeys: UserKeys,
  key: string,
): Promise<{ keys: UserKeys, clearMnemonic: string }> {
  const keyArray = utils.base64ToUint8Array(key);
  const cryptoKey = await symmetric.importSymmetricCryptoKey(keyArray);
  const privateKey = await symmetric.decryptSymmetrically(cryptoKey, encKeys.privateKey, 'user-private-key');
  const privateKyberKey =  await symmetric.decryptSymmetrically(cryptoKey, encKeys.privateKey, 'user-private-kyber-key');
  const publicKey = encKeys.publicKey;
  const publicKyberKey = encKeys.publicKey;
  const clearMnemonic = await symmetric.decryptSymmetrically(cryptoKey, encMnemonic, 'user-mnemonic');

  const keys = { privateKey, publicKey, privateKyberKey, publicKyberKey };

  return { keys, clearMnemonic };
}

export const logInOpaque = async (params: LogInParams): Promise<ProfileInfo> => {
  const { email, password, twoFactorCode, dispatch} = params;
  const authClient = SdkFactory.getNewApiInstance().createAuthClient();
  const { clientLoginState, startLoginRequest } = opaque.client.startLogin({
    password,
  });

  const response = await authClient.loginOpaqueStart(email, startLoginRequest, twoFactorCode);
  const loginResult = opaque.client.finishLogin({
    clientLoginState,
    loginResponse: response.loginResponse,
    password,
    keyStretching: 'memory-constrained',
  });
  if (!loginResult) {
    throw new Error('Login failed');
  }
  const { exportKey, finishLoginRequest }= loginResult;
  const data = await authClient.loginOpaqueFinish(email, finishLoginRequest);
  const { user, token, newToken } = data;

  const encKeys: UserKeys = {
      privateKey: user.keys.ecc.privateKey,
      publicKey: user.keys.ecc.publicKey,
      privateKyberKey: user.keys.kyber.privateKey,
      publicKyberKey: user.keys.kyber.publicKey, 
    };
  const { keys, clearMnemonic } = await decryptUserKeysAndMnemonic(user.mnemonic, encKeys, exportKey);
  Sentry.setUser({
    id: user.uuid,
    email: user.email,
    sharedWorkspace: user.sharedWorkspace,
  });

  const clearUser = {
    ...user,
    mnemonic: clearMnemonic,
    privateKey: keys.privateKey,
    keys: {
      ecc: {
        publicKey: keys.publicKey,
        privateKey: keys.privateKey,
      },
      kyber: {
        publicKey: keys.publicKyberKey,
        privateKey: keys.privateKyberKey,
      },
    },
  };

  localStorageService.set('xToken', token);
  localStorageService.set('xMnemonic', clearMnemonic);
  localStorageService.set('xNewToken', newToken);

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

  return { token, user: clearUser, mnemonic: clearMnemonic, newToken };
};


export const signUpOpaque = async (params: SignUpParams) => {
  const { email, password, token, redeemCodeObject, dispatch } = params;
  const { clientRegistrationState, registrationRequest } = opaque.client.startRegistration({ password });
  const authClient = SdkFactory.getNewApiInstance().createAuthClient();
  const response = await authClient.signupOpaqueStart(email, registrationRequest, token, readReferalCookie());

  const {exportKey,  registrationRecord } = opaque.client.finishRegistration({
  clientRegistrationState,
  registrationResponse: response.signUpResponse,
  password,
});
  const clearMnemonic = bip39.generateMnemonic(256);
   const { privateKeyArmored, publicKeyArmored, publicKyberKeyBase64, privateKyberKeyBase64 } =
    await generateNewKeys();
  const keys: UserKeys = {
    privateKey: privateKeyArmored,
    publicKey: publicKeyArmored,
    privateKyberKey: privateKyberKeyBase64,
    publicKyberKey: publicKyberKeyBase64,
  };
  const {encKeys, encMnemonic} = await encryptUserKeysAndMnemonic(keys, clearMnemonic, exportKey);
  const registerDetails: RegisterOpaqueDetails = {
    name: 'My',
    lastname: 'Internxt',
    email: email.toLowerCase(),
    encKeys: encKeys,
    encMnemonic: encMnemonic,
    captcha: token,
  };

  const data = await authClient.signupOpaqueFinish(registrationRecord, registerDetails);
  const { user: xUser, token: xToken, newToken } = data;
  localStorageService.clear();

  localStorageService.set('xToken', xToken);
  localStorageService.set('xMnemonic', clearMnemonic);
  localStorageService.set('xNewToken', newToken);

  const user = {
    ...xUser,
    privateKey: keys.privateKey,
    keys: {
      ecc: {
        publicKey: keys.publicKey,
        privateKey: keys.privateKey,
      },
      kyber: {
        publicKey: keys.publicKyberKey,
        privateKey: keys.privateKyberKey,
      },
    },
  } as UserSettings;

  dispatch(userActions.setUser(user));
  await dispatch(userThunks.initializeUserThunk());
  dispatch(productsThunks.initializeThunk());

  if (!redeemCodeObject) dispatch(planThunks.initializeThunk());
  dispatch(referralsThunks.initializeThunk());
  await trackSignUp(xUser.uuid);

  return { token: xToken, user: xUser, mnemonic: clearMnemonic, newToken };
};