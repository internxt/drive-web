import { aes } from '@internxt/lib';

import {
  decryptText,
  decryptTextWithKey,
  encryptText,
  encryptTextWithKey,
  passToHash,
} from 'app/crypto/services/utils';
import { decryptPGP } from 'app/crypto/services/utilspgp';
import i18n from 'app/i18n/services/i18n.service';
import databaseService from 'app/database/services/database.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import navigationService from 'app/core/services/navigation.service';
import localStorageService from 'app/core/services/local-storage.service';
import analyticsService from 'app/analytics/services/analytics.service';
import httpService from 'app/core/services/http.service';
import { getAesInitFromEnv, validateFormat } from 'app/crypto/services/keys.service';
import { AppView, Workspace } from 'app/core/types';
import { generateNewKeys, updateKeys } from 'app/crypto/services/pgp.service';
import { UserSettings } from '../types';
import { TeamsSettings } from 'app/teams/types';

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

export const doLogin = async (
  email: string,
  password: string,
  twoFactorCode: string,
): Promise<{ data: { token: string; user: UserSettings; userTeam: TeamsSettings | null }; user: UserSettings }> => {
  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/login`, {
    method: 'post',
    headers: httpService.getHeaders(false, false),
    body: JSON.stringify({ email }),
  });
  const body = await response.json();

  if (response.status === 400) {
    throw new Error(body.error || 'Can not connect to server');
  }
  if (response.status !== 200) {
    throw new Error('This account does not exist');
  }

  // Manage credentials verification
  const keys = await generateNewKeysWithEncrypted(password);
  // Check password
  const salt = decryptText(body.sKey);
  const hashObj = passToHash({ password, salt });
  const encPass = encryptText(hashObj.hash);

  return doAccess(email, password, encPass, twoFactorCode, keys);
};

export const doAccess = async (
  email: string,
  password: string,
  encPass: string,
  twoFactorCode: string,
  keys: {
    privateKeyArmored: string;
    privateKeyArmoredEncrypted: string;
    publicKeyArmored: string;
    revocationCertificate: string;
  },
): Promise<{ data: { token: string; user: UserSettings; userTeam: TeamsSettings | null }; user: UserSettings }> => {
  try {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/access`, {
      method: 'post',
      headers: httpService.getHeaders(false, false),
      body: JSON.stringify({
        email,
        password: encPass,
        tfa: twoFactorCode,
        privateKey: keys.privateKeyArmoredEncrypted,
        publicKey: keys.publicKeyArmored,
        revocateKey: keys.revocationCertificate,
      }),
    });
    const data = await response.json();

    if (response.status !== 200) {
      analyticsService.signInAttempted(email, data.error);
      throw new Error(data.error ? data.error : data);
    }
    const privateKey = data.user.privateKey;
    const publicKey = data.user.publicKey;
    const revocateKey = data.user.revocateKey;
    const { update, privkeyDecrypted, newPrivKey } = await validateFormat(privateKey, password);

    analyticsService.identify(data.user.uuid, email);

    // Manage successfull login
    const user = {
      ...data.user,
      mnemonic: decryptTextWithKey(data.user.mnemonic, password),
      email,
      privateKey: Buffer.from(privkeyDecrypted).toString('base64'),
      publicKey: publicKey,
      revocationKey: revocateKey,
    };

    if (data.userTeam) {
      const mnemonicDecode = Buffer.from(data.userTeam.bridge_mnemonic, 'base64').toString();
      const mnemonicDecrypt = await decryptPGP(mnemonicDecode);
      const team = {
        idTeam: data.userTeam.idTeam,
        user: data.userTeam.bridge_user,
        password: data.userTeam.bridge_password,
        mnemonic: mnemonicDecrypt.data,
        admin: data.userTeam.admin,
        root_folder_id: data.userTeam.root_folder_id,
        isAdmin: data.userTeam.isAdmin,
      };

      localStorageService.set('xTeam', JSON.stringify(team));
      localStorageService.set('xTokenTeam', data.tokenTeam);
    }

    localStorageService.set('xToken', data.token);
    localStorageService.set('xMnemonic', user.mnemonic);

    if (update) {
      await updateKeys(publicKey, newPrivKey, revocateKey);
    }

    return { data, user };
  } catch (err: unknown) {
    throw err instanceof Error ? err : new Error(err as string);
  }
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
  const encryptedMnemonic = encryptTextWithKey(localStorage.xMnemonic, newPassword);
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
  doAccess,
  check2FANeeded,
  readReferalCookie,
  cancelAccount,
  store2FA,
};

export default authService;
