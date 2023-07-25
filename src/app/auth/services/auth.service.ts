import * as Sentry from '@sentry/react';
import { aes } from '@internxt/lib';
import {
  CryptoProvider,
  Keys,
  LoginDetails,
  Password,
  SecurityDetails,
  TwoFactorAuthQR,
  UserAccessError,
} from '@internxt/sdk/dist/auth';
import {
  decryptText,
  decryptTextWithKey,
  encryptText,
  encryptTextWithKey,
  passToHash,
} from 'app/crypto/services/utils';
import databaseService from 'app/database/services/database.service';
import navigationService from 'app/core/services/navigation.service';
import localStorageService from 'app/core/services/local-storage.service';
import analyticsService from 'app/analytics/services/analytics.service';
import { getAesInitFromEnv, validateFormat } from 'app/crypto/services/keys.service';
import { AppView } from 'app/core/types';
import { generateNewKeys } from 'app/crypto/services/pgp.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { SdkFactory } from '../../core/factory/sdk';
import { ChangePasswordPayload } from '@internxt/sdk/dist/drive/users/types';
import httpService from '../../core/services/http.service';
import RealtimeService from 'app/core/services/socket.service';
import { getCookie, setCookie } from 'app/analytics/utils';

export async function logOut(): Promise<void> {
  analyticsService.trackSignOut();
  await databaseService.clear();
  localStorageService.clear();
  RealtimeService.getInstance().stop();
  navigationService.push(AppView.Login);
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
    throw new Error(error.message ?? 'Login error');
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

export const doLogin = async (
  email: string,
  password: string,
  twoFactorCode: string,
): Promise<{
  user: UserSettings;
  token: string;
}> => {
  const authClient = SdkFactory.getInstance().createAuthClient();
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
      return Promise.resolve(keys);
    },
  };

  return authClient
    .login(loginDetails, cryptoProvider)
    .then(async (data) => {
      const { user, token, newToken } = data;

      const publicKey = user.publicKey;
      const privateKey = user.privateKey;
      const revocationCertificate = user.revocationKey;

      const { update, privkeyDecrypted, newPrivKey } = await validateFormat(privateKey, password);
      const newKeys: Keys = {
        privateKeyEncrypted: newPrivKey,
        publicKey: publicKey,
        revocationCertificate: revocationCertificate,
      };
      if (update) {
        await authClient.updateKeys(newKeys, token);
      }

      const clearMnemonic = decryptTextWithKey(user.mnemonic, password);
      const clearPrivateKeyBase64 = Buffer.from(privkeyDecrypted).toString('base64');

      const clearUser = {
        ...user,
        mnemonic: clearMnemonic,
        privateKey: clearPrivateKeyBase64,
      };

      localStorageService.set('xToken', token);
      localStorageService.set('xMnemonic', clearMnemonic);
      localStorageService.set('xNewToken', newToken);

      Sentry.setUser({
        id: user.uuid,
        email: user.email,
        sharedWorkspace: user.sharedWorkspace,
      });

      return {
        user: clearUser,
        token: token,
      };
    })
    .catch((error) => {
      if (error instanceof UserAccessError) {
        analyticsService.signInAttempted(email, error.message);
      }
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
  token: string,
  newPassword: string,
  mnemonicInPlain: string,
  privateKeyInPlain: string
): Promise<void> => {
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
    encryptedMnemonic
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
    .changePassword(<ChangePasswordPayload>{
      currentEncryptedPassword: encryptedCurrentPassword,
      newEncryptedPassword: encryptedNewPassword,
      newEncryptedSalt: encryptedNewSalt,
      encryptedMnemonic: encryptedMnemonic,
      encryptedPrivateKey: privateKeyEncrypted,
    })
    .then(() => {
      // !TODO: Add the correct analytics event  when change password is completed
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

export async function getNewToken(): Promise<string> {
  const res = await fetch(`${process.env.REACT_APP_API_URL}/api/new-token`, {
    headers: httpService.getHeaders(true, false),
  });
  if (!res.ok) {
    throw new Error('Bad response while getting new token');
  }

  const { newToken } = await res.json();

  return newToken;
}

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

const changePasswordWithLink = (
  token: string | undefined,
  password: string,
  salt: string,
  mnemonic: string,
): Promise<void> => {
  const authClient = SdkFactory.getNewApiInstance().createAuthClient();
  return authClient.changePasswordWithLink(token, password, salt, mnemonic);
};

const authService = {
  logOut,
  doLogin,
  check2FANeeded: is2FANeeded,
  readReferalCookie,
  cancelAccount,
  store2FA,
  extractOneUseCredentialsForAutoSubmit,
  getNewToken,
  getRedirectUrl,
  sendChangePasswordEmail,
  changePasswordWithLink,
};

export default authService;
