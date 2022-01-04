import { aes } from '@internxt/lib';
import { CryptoProvider, Keys, LoginDetails, Password, UserAccessError } from '@internxt/sdk/dist/auth';
import {
  decryptText,
  decryptTextWithKey,
  encryptText,
  encryptTextWithKey,
  passToHash,
} from 'app/crypto/services/utils';
import i18n from 'app/i18n/services/i18n.service';
import databaseService from 'app/database/services/database.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import navigationService from 'app/core/services/navigation.service';
import localStorageService from 'app/core/services/local-storage.service';
import analyticsService from 'app/analytics/services/analytics.service';
import httpService from 'app/core/services/http.service';
import { getAesInitFromEnv, validateFormat } from 'app/crypto/services/keys.service';
import { AppView, Workspace } from 'app/core/types';
import { generateNewKeys } from 'app/crypto/services/pgp.service';
import { UserSettings } from '../types';
import { createAuthClient } from '../../../factory/modules';

export async function logOut(): Promise<void> {
  analyticsService.trackSignOut();
  await databaseService.clear();
  localStorageService.clear();
  navigationService.push(AppView.Login);
}

export function cancelAccount(): Promise<void> {
  return httpService
    .get<void>('/api/deactivate', { authWorkspace: Workspace.Individuals })
    .then(() => {
      notificationsService.show(i18n.get('success.accountDeactivationEmailSent'), ToastType.Info);
    })
    .catch((err) => {
      notificationsService.show(i18n.get('error.deactivatingAccount'), ToastType.Warning);
      console.log(err);
      throw err;
    });
}

export const check2FANeeded = async (email: string): Promise<{ hasKeys: boolean; sKey: string; tfa: boolean }> => {
  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/login`, {
    method: 'POST',
    headers: httpService.getHeaders(true, true),
    body: JSON.stringify({ email }),
  });
  const data = await response.json();

  if (response.status !== 200) {
    analyticsService.signInAttempted(email, data.error);
    throw new Error(data.error ? data.error : 'Login error');
  }
  return data;
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

export const doLogin = async (email: string, password: string, twoFactorCode: string): Promise<{
  user: UserSettings
  token: string;
}> => {
  const authClient = createAuthClient();
  const loginDetails: LoginDetails = {
    email: email,
    password: password,
    tfaCode: twoFactorCode
  };
  const cryptoProvider: CryptoProvider = {
    encryptPasswordHash(password: Password, encryptedSalt: string): string {
      const salt = decryptText(encryptedSalt);
      const hashObj = passToHash({ password, salt });
      return encryptText(hashObj.hash);
    },
    async generateKeys(password: Password): Promise<Keys> {
      const {
        privateKeyArmoredEncrypted,
        publicKeyArmored,
        revocationCertificate,
      } = await generateNewKeysWithEncrypted(password);
      const keys: Keys = {
        privateKeyEncrypted: privateKeyArmoredEncrypted,
        publicKey: publicKeyArmored,
        revocationCertificate: revocationCertificate
      };
      return Promise.resolve(keys);
    }
  };

  return authClient.login(loginDetails, cryptoProvider)
    .then(async data => {
      const user = data.user;
      const token = data.token;

      const publicKey = user.publicKey;
      const privateKey = user.privateKey;
      const revocationCertificate = user.revocationKey;

      const { update, privkeyDecrypted, newPrivKey } = await validateFormat(privateKey, password);
      const newKeys: Keys = {
        privateKeyEncrypted: newPrivKey,
        publicKey: publicKey,
        revocationCertificate: revocationCertificate
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

      return {
        user: clearUser,
        token: token
      };
    })
    .catch(error => {
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

  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/login`, {
    method: 'post',
    headers: httpService.getHeaders(false, false),
    body: JSON.stringify({ email }),
  });
  const data = await response.json();
  const salt = decryptText(data.sKey);

  return salt;
};

export const getPasswordDetails = async (
  currentPassword: string,
): Promise<{ salt: string; hashedCurrentPassword: string; encryptedCurrentPassword: string }> => {
  const salt = await getSalt();
  if (!salt) {
    throw new Error('Internal server error. Please reload.');
  }

  // Encrypt the password
  const hashedCurrentPassword = passToHash({ password: currentPassword, salt }).hash;
  const encryptedCurrentPassword = encryptText(hashedCurrentPassword);

  return { salt, hashedCurrentPassword, encryptedCurrentPassword };
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

  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user/password`, {
    method: 'PATCH',
    headers: httpService.getHeaders(true, true),
    body: JSON.stringify({
      currentPassword: encryptedCurrentPassword,
      newPassword: encryptedNewPassword,
      newSalt: encryptedNewSalt,
      mnemonic: encryptedMnemonic,
      privateKey: privateKeyEncrypted,
    }),
  });

  const data = await response.json();

  if (response.status === 500) {
    analyticsService.track(email, 'error');
    throw new Error('The password you introduced does not match your current password');
  }

  if (response.status !== 200) {
    analyticsService.track(email, 'error');
    throw new Error(data.error);
  }

  analyticsService.track(email, 'success');
};

export const userHas2FAStored = async (): Promise<{
  has2fa: boolean;
  data: { hasKeys: boolean; sKey: string; tfa: boolean };
}> => {
  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/login`, {
    method: 'POST',
    headers: httpService.getHeaders(true, false),
    body: JSON.stringify({ email: JSON.parse(localStorage.xUser).email }),
  });
  const data = await response.json();

  return { has2fa: typeof data.tfa === 'boolean', data };
};

export const generateNew2FA = async (): Promise<{ qr: string; code: string }> => {
  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/tfa`, {
    method: 'GET',
    headers: httpService.getHeaders(true, false),
  });
  const data = await response.json();

  if (response.status !== 200) {
    throw new Error(data);
  }
  return data;
};

export const deactivate2FA = async (
  passwordSalt: string,
  deactivationPassword: string,
  deactivationCode: string,
): Promise<void> => {
  const salt = decryptText(passwordSalt);
  const hashObj = passToHash({ password: deactivationPassword, salt });
  const encPass = encryptText(hashObj.hash);

  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/tfa`, {
    method: 'DELETE',
    headers: httpService.getHeaders(true, false),
    body: JSON.stringify({
      pass: encPass,
      code: deactivationCode,
    }),
  });
  const data = await response.json();

  if (response.status !== 200) {
    throw new Error(data.error);
  }
};

const store2FA = async (code: string, twoFactorCode: string): Promise<void> => {
  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/tfa`, {
    method: 'PUT',
    headers: httpService.getHeaders(true, false),
    body: JSON.stringify({
      key: code,
      code: twoFactorCode,
    }),
  });
  const data = await response.json();

  if (response.status !== 200) {
    throw new Error(data.error);
  }
};

const authService = {
  logOut,
  doLogin,
  check2FANeeded,
  readReferalCookie,
  cancelAccount,
  store2FA,
};

export default authService;
