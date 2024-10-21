import { aes } from '@internxt/lib';
import {
  CryptoProvider,
  Keys,
  LoginDetails,
  Password,
  SecurityDetails,
  TwoFactorAuthQR,
} from '@internxt/sdk/dist/auth';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import * as Sentry from '@sentry/react';
import analyticsService from 'app/analytics/services/analytics.service';
import { getCookie, setCookie } from 'app/analytics/utils';
import localStorageService from 'app/core/services/local-storage.service';
import navigationService from 'app/core/services/navigation.service';
import RealtimeService from 'app/core/services/socket.service';
import { AppView } from 'app/core/types';
import {
  assertPrivateKeyIsValid,
  assertValidateKeys,
  decryptPrivateKey,
  getAesInitFromEnv,
} from 'app/crypto/services/keys.service';
import { generateNewKeys } from 'app/crypto/services/pgp.service';
import {
  decryptText,
  decryptTextWithKey,
  encryptText,
  encryptTextWithKey,
  passToHash,
} from 'app/crypto/services/utils';
import databaseService from 'app/database/services/database.service';
import { generateMnemonic, validateMnemonic } from 'bip39';
import { SdkFactory } from '../../core/factory/sdk';
import httpService from '../../core/services/http.service';
import AppError from 'app/core/types';
import { RegisterFunction, UpdateInfoFunction } from 'app/auth/components/SignUp/useSignUp';
import { AppDispatch } from 'app/store';
import { initializeUserThunk, userActions, userThunks } from 'app/store/slices/user';
import { planThunks } from 'app/store/slices/plan';
import { productsThunks } from 'app/store/slices/products';
import { referralsThunks } from 'app/store/slices/referrals';
import { AuthMethodTypes } from 'app/payment/types';
import { workspaceThunks } from 'app/store/slices/workspaces/workspacesStore';
import { ChangePasswordPayload } from '@internxt/sdk/dist/drive/users/types';

type ProfileInfo = {
  user: UserSettings;
  token: string;
  mnemonic: string;
};

type SignUpParams = {
  doSignUp: RegisterFunction | UpdateInfoFunction;
  email: string;
  password: string;
  token: string;
  isNewUser: boolean;
  redeemCodeObject: boolean;
  dispatch: AppDispatch;
};

type LogInParams = {
  email: string;
  password: string;
  twoFactorCode: string;
  dispatch: AppDispatch;
  loginType?: 'web' | 'desktop';
};

export type AuthenticateUserParams = {
  email: string;
  password: string;
  authMethod: AuthMethodTypes;
  twoFactorCode: string;
  dispatch: AppDispatch;
  loginType?: 'web' | 'desktop';
  token?: string;
  isNewUser?: boolean;
  redeemCodeObject?: boolean;
  doSignUp?: RegisterFunction | UpdateInfoFunction;
};

export async function logOut(loginParams?: Record<string, string>): Promise<void> {
  analyticsService.trackSignOut();
  await databaseService.clear();
  localStorageService.clear();
  RealtimeService.getInstance().stop();
  if (!navigationService.isCurrentPath(AppView.BlockedAccount) && !navigationService.isCurrentPath(AppView.Checkout)) {
    navigationService.push(AppView.Login, loginParams);
  }
}

export function cancelAccount(): Promise<void> {
  const email = localStorageService.getUser()?.email;
  const authClient = SdkFactory.getInstance().createAuthClient();
  return authClient.sendDeactivationEmail(<string>email);
}

export const is2FANeeded = async (email: string): Promise<boolean> => {
  const authClient = SdkFactory.getInstance().createAuthClient();
  const securityDetails = await authClient.securityDetails(email).catch((error) => {
    analyticsService.signInAttempted(email, error.message);
    throw new AppError(error.message ?? 'Login error', error.status ?? 500);
  });

  return securityDetails.tfaEnabled;
};

const generateNewKeysWithEncrypted = async (password: string) => {
  const { privateKeyArmored, publicKeyArmored, revocationCertificate } = await generateNewKeys();

  return {
    privateKeyArmored,
    privateKeyArmoredEncrypted: aes.encrypt(privateKeyArmored, password, getAesInitFromEnv()),
    publicKeyArmored,
    revocationCertificate,
  };
};

const getAuthClient = (authType: 'web' | 'desktop') => {
  const AUTH_CLIENT = {
    web: SdkFactory.getInstance().createAuthClient(),
    desktop: SdkFactory.getInstance().createDesktopAuthClient(),
  };

  return AUTH_CLIENT[authType];
};

export const doLogin = async (
  email: string,
  password: string,
  twoFactorCode: string,
  loginType: 'web' | 'desktop' | undefined = 'web',
): Promise<ProfileInfo> => {
  const authClient = getAuthClient(loginType);
  const loginDetails: LoginDetails = {
    email: email.toLowerCase(),
    password: password,
    tfaCode: twoFactorCode,
  };
  const cryptoProvider: CryptoProvider = {
    encryptPasswordHash(password: Password, encryptedSalt: string): string {
      const salt = decryptText(encryptedSalt);
      const hashObj = passToHash({ password, salt });
      return encryptText(hashObj.hash);
    },
    async generateKeys(password: Password): Promise<Keys> {
      const { privateKeyArmoredEncrypted, publicKeyArmored, revocationCertificate } =
        await generateNewKeysWithEncrypted(password);
      const keys: Keys = {
        privateKeyEncrypted: privateKeyArmoredEncrypted,
        publicKey: publicKeyArmored,
        revocationCertificate: revocationCertificate,
      };
      return keys;
    },
  };

  return authClient
    .login(loginDetails, cryptoProvider)
    .then(async (data) => {
      const { user, token, newToken } = data;
      const { privateKey, publicKey } = user;

      Sentry.setUser({
        id: user.uuid,
        email: user.email,
        sharedWorkspace: user.sharedWorkspace,
      });

      const plainPrivateKeyInBase64 = privateKey
        ? Buffer.from(decryptPrivateKey(privateKey, password)).toString('base64')
        : '';

      if (privateKey) {
        await assertPrivateKeyIsValid(privateKey, password);
        await assertValidateKeys(
          Buffer.from(plainPrivateKeyInBase64, 'base64').toString(),
          Buffer.from(publicKey, 'base64').toString(),
        );
      }

      const clearMnemonic = decryptTextWithKey(user.mnemonic, password);
      const clearUser = {
        ...user,
        mnemonic: clearMnemonic,
        privateKey: plainPrivateKeyInBase64,
      };

      localStorageService.set('xToken', token);
      localStorageService.set('xMnemonic', clearMnemonic);
      localStorageService.set('xNewToken', newToken);

      return {
        user: clearUser,
        token: token,
        mnemonic: clearMnemonic,
      };
    })
    .catch((error) => {
      analyticsService.signInAttempted(email, error.message);
      throw error;
    });
};

export const readReferalCookie = (): string | undefined => {
  const cookie = document.cookie.match(/(^| )REFERRAL=([^;]+)/);

  return cookie ? cookie[2] : undefined;
};

export const getSalt = async (): Promise<string> => {
  const email = localStorageService.getUser()?.email;
  const authClient = SdkFactory.getInstance().createAuthClient();
  const securityDetails = await authClient.securityDetails(String(email));
  return decryptText(securityDetails.encryptedSalt);
};

export const getPasswordDetails = async (
  currentPassword: string,
): Promise<{ salt: string; hashedCurrentPassword: string; encryptedCurrentPassword: string }> => {
  const salt = await getSalt();
  if (!salt) {
    throw new Error('Internal server error. Please reload.');
  }

  // Encrypt  the password
  const hashedCurrentPassword = passToHash({ password: currentPassword, salt }).hash;
  const encryptedCurrentPassword = encryptText(hashedCurrentPassword);

  return { salt, hashedCurrentPassword, encryptedCurrentPassword };
};

const updateCredentialsWithToken = async (
  token: string | undefined,
  newPassword: string,
  mnemonicInPlain: string,
  privateKeyInPlain: string,
): Promise<void> => {
  const mnemonicIsInvalid = !validateMnemonic(mnemonicInPlain);
  if (mnemonicIsInvalid) {
    throw new Error('Invalid mnemonic');
  }

  const hashedNewPassword = passToHash({ password: newPassword });
  const encryptedHashedNewPassword = encryptText(hashedNewPassword.hash);
  const encryptedHashedNewPasswordSalt = encryptText(hashedNewPassword.salt);

  const encryptedMnemonic = encryptTextWithKey(mnemonicInPlain, newPassword);
  // const privateKey = Buffer.from(privateKeyInPlain, 'base64').toString();
  // const privateKeyEncrypted = aes.encrypt(privateKey, newPassword, getAesInitFromEnv());

  const authClient = SdkFactory.getNewApiInstance().createAuthClient();
  return authClient.changePasswordWithLink(
    token,
    encryptedHashedNewPassword,
    encryptedHashedNewPasswordSalt,
    encryptedMnemonic,
  );
};

const resetAccountWithToken = async (token: string | undefined, newPassword: string): Promise<void> => {
  const newMnemonic = generateMnemonic(256);
  const mnemonicIsInvalid = !validateMnemonic(newMnemonic);

  if (mnemonicIsInvalid) {
    throw new Error('Invalid mnemonic');
  }

  const encryptedNewMnemonic = encryptTextWithKey(newMnemonic, newPassword);

  const hashedNewPassword = passToHash({ password: newPassword });
  const encryptedHashedNewPassword = encryptText(hashedNewPassword.hash);
  const encryptedHashedNewPasswordSalt = encryptText(hashedNewPassword.salt);

  const authClient = SdkFactory.getNewApiInstance().createAuthClient();

  return authClient.resetAccountWithToken(
    token,
    encryptedHashedNewPassword,
    encryptedHashedNewPasswordSalt,
    encryptedNewMnemonic,
  );
};

export const changePassword = async (newPassword: string, currentPassword: string, email: string): Promise<void> => {
  const user = localStorageService.getUser() as UserSettings;

  const { encryptedCurrentPassword } = await getPasswordDetails(currentPassword);

  // Encrypt the new password
  const hashedNewPassword = passToHash({ password: newPassword });
  const encryptedNewPassword = encryptText(hashedNewPassword.hash);
  const encryptedNewSalt = encryptText(hashedNewPassword.salt);

  // Encrypt the mnemonic
  const encryptedMnemonic = encryptTextWithKey(user.mnemonic, newPassword);
  const privateKey = Buffer.from(user.privateKey, 'base64').toString();
  const privateKeyEncrypted = aes.encrypt(privateKey, newPassword, getAesInitFromEnv());

  const usersClient = SdkFactory.getInstance().createUsersClient();

  return usersClient
    .changePasswordLegacy(<ChangePasswordPayload>{
      currentEncryptedPassword: encryptedCurrentPassword,
      newEncryptedPassword: encryptedNewPassword,
      newEncryptedSalt: encryptedNewSalt,
      encryptedMnemonic: encryptedMnemonic,
      encryptedPrivateKey: privateKeyEncrypted,
    })
    .then((res) => {
      // !TODO: Add the correct analytics event  when change password is completed
      const { token, newToken } = res as any;
      if (token) localStorageService.set('xToken', token);
      if (newToken) localStorageService.set('xNewToken', newToken);
    })
    .catch((error) => {
      // !TODO: Add the correct analytics event when change password fails
      if (error.status === 500) {
        throw new Error('The password you introduced does not match your current password');
      }
      throw error;
    });
};

export const userHas2FAStored = (): Promise<SecurityDetails> => {
  const email = localStorageService.getUser()?.email;
  const authClient = SdkFactory.getInstance().createAuthClient();
  return authClient.securityDetails(<string>email);
};

export const generateNew2FA = (): Promise<TwoFactorAuthQR> => {
  const authClient = SdkFactory.getInstance().createAuthClient();
  return authClient.generateTwoFactorAuthQR();
};

export const deactivate2FA = (
  passwordSalt: string,
  deactivationPassword: string,
  deactivationCode: string,
): Promise<void> => {
  const salt = decryptText(passwordSalt);
  const hashObj = passToHash({ password: deactivationPassword, salt });
  const encPass = encryptText(hashObj.hash);
  const authClient = SdkFactory.getInstance().createAuthClient();
  return authClient.disableTwoFactorAuth(encPass, deactivationCode);
};

export const getNewToken = async (): Promise<string> => {
  const res = await fetch(`${process.env.REACT_APP_API_URL}/new-token`, {
    headers: httpService.getHeaders(true, false),
  });
  if (!res.ok) {
    throw new Error('Bad response while getting new token');
  }

  const { newToken } = await res.json();

  return newToken;
};

export async function areCredentialsCorrect(email: string, password: string): Promise<boolean> {
  const salt = await getSalt();
  const { hash: hashedPassword } = passToHash({ password, salt });
  const authClient = SdkFactory.getInstance().createAuthClient();

  return authClient.areCredentialsCorrect(email, hashedPassword);
}

export const getRedirectUrl = (urlSearchParams: URLSearchParams, token: string): string | null => {
  const ALLOWED_DOMAINS = ['https://internxt.com', 'https://drive.internxt.com'];
  const redirectUrl = urlSearchParams.get('redirectUrl');

  if (!redirectUrl) return null;
  const allowed = ALLOWED_DOMAINS.some((allowedDomain) => redirectUrl.includes(allowedDomain));

  if (!allowed) return null;

  const url = new URL(redirectUrl);
  const currentParams = url.searchParams;

  if (currentParams.get('auth') !== 'true') {
    return url.origin + url.pathname + '?' + currentParams.toString();
  }
  currentParams.set('authToken', token);

  return url.origin + url.pathname + '?' + currentParams.toString();
};

const store2FA = async (code: string, twoFactorCode: string): Promise<void> => {
  const authClient = SdkFactory.getInstance().createAuthClient();
  return authClient.storeTwoFactorAuthKey(code, twoFactorCode);
};

/**
 * Obtains the credentials from a cookie for one use only
 * @param searchParams Url search params to enable the autosubmit mode
 * @returns The credentials and the submit mode enabled or not
 */
const extractOneUseCredentialsForAutoSubmit = (
  searchParams: URLSearchParams,
): {
  enabled: boolean;
  credentials?: {
    email: string;
    password: string;
    redeemCodeObject?: {
      code: string;
      provider: string;
    };
  };
} => {
  // Auto submit is not enabled;
  if (searchParams.get('autoSubmit') !== 'true') {
    return { enabled: false };
  }

  try {
    const cookie = getCookie('cr');
    const credentials = JSON.parse(atob(cookie));

    // Delete the cookie
    setCookie('cr', '', -999);
    return {
      enabled: true,
      credentials: {
        email: credentials.email,
        password: credentials.password,
        redeemCodeObject: credentials.redeemCode,
      },
    };
  } catch (error) {
    return {
      enabled: true,
    };
  }
};

const sendChangePasswordEmail = (email: string): Promise<void> => {
  const authClient = SdkFactory.getNewApiInstance().createAuthClient();
  return authClient.sendChangePasswordEmail(email);
};

export const requestUnblockAccount = (email: string): Promise<void> => {
  const authClient = SdkFactory.getNewApiInstance().createAuthClient();
  return authClient.requestUnblockAccount(email);
};

export const unblockAccount = (token: string): Promise<void> => {
  const authClient = SdkFactory.getNewApiInstance().createAuthClient();
  return authClient.unblockAccount(token);
};

export const signUp = async (params: SignUpParams) => {
  const { doSignUp, email, password, token, isNewUser, redeemCodeObject, dispatch } = params;
  const { xUser, xToken, mnemonic } = isNewUser
    ? await (doSignUp as RegisterFunction)(email, password, token)
    : await (doSignUp as UpdateInfoFunction)(email, password);

  localStorageService.clear();

  localStorageService.set('xToken', xToken);
  localStorageService.set('xMnemonic', mnemonic);

  const xNewToken = await getNewToken();
  localStorageService.set('xNewToken', xNewToken);

  const privateKey = xUser.privateKey
    ? Buffer.from(decryptPrivateKey(xUser.privateKey, password)).toString('base64')
    : undefined;

  const user = {
    ...xUser,
    privateKey,
  } as UserSettings;

  dispatch(userActions.setUser(user));
  await dispatch(userThunks.initializeUserThunk());
  dispatch(productsThunks.initializeThunk());

  if (!redeemCodeObject) dispatch(planThunks.initializeThunk());
  if (isNewUser) dispatch(referralsThunks.initializeThunk());
  return { token: xToken, user: xUser, mnemonic };
};

export const logIn = async (params: LogInParams): Promise<ProfileInfo> => {
  const { email, password, twoFactorCode, dispatch, loginType = 'web' } = params;
  const { token, user, mnemonic } = await doLogin(email, password, twoFactorCode, loginType);
  dispatch(userActions.setUser(user));
  window.rudderanalytics.identify(user.uuid, { email: user.email, uuid: user.uuid });

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

  userActions.setUser(user);

  return { token, user, mnemonic };
};

export const authenticateUser = async (params: AuthenticateUserParams): Promise<ProfileInfo> => {
  const {
    email,
    password,
    authMethod,
    twoFactorCode,
    dispatch,
    loginType = 'web',
    token = '',
    isNewUser = true,
    redeemCodeObject = false,
    doSignUp,
  } = params;
  if (authMethod === 'signIn') {
    const profileInfo = await logIn({ email, password, twoFactorCode, dispatch, loginType });
    window.rudderanalytics.track('User Signin', { email });
    window.gtag('event', 'User Signin', { method: 'email' });
    return profileInfo;
  } else if (authMethod === 'signUp' && doSignUp) {
    const profileInfo = await signUp({ doSignUp, email, password, token, isNewUser, redeemCodeObject, dispatch });
    return profileInfo;
  } else {
    throw new Error(`Unknown authMethod: ${authMethod}`);
  }
};

const authService = {
  logOut,
  check2FANeeded: is2FANeeded,
  readReferalCookie,
  cancelAccount,
  store2FA,
  extractOneUseCredentialsForAutoSubmit,
  getNewToken,
  getRedirectUrl,
  sendChangePasswordEmail,
  updateCredentialsWithToken,
  resetAccountWithToken,
  requestUnblockAccount,
  unblockAccount,
  authenticateUser,
};

export default authService;
