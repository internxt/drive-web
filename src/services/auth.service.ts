import * as bip39 from 'bip39';
import { aes } from '@internxt/lib';

import { getHeaders } from '../lib/auth';
import localStorageService from './local-storage.service';
import history from '../lib/history';
import analyticsService from './analytics.service';
import { generateNewKeys, updateKeys } from './pgp.service';
import { decryptText, decryptTextWithKey, encryptText, encryptTextWithKey, passToHash } from '../lib/utils';
import { getAesInitFromEnv, validateFormat } from './keys.service';
import { decryptPGP } from '../lib/utilspgp';
import userService from './user.service';
import i18n from './i18n.service';
import { UserSettings } from '../models/interfaces';
import httpService from './http.service';
import { Workspace } from '../models/enums';
import notificationsService, { ToastType } from './notifications.service';

export function logOut(): void {
  analyticsService.trackSignOut();
  localStorageService.clear();
  history.push('/login');
}

export function cancelAccount(): Promise<void> {
  return httpService
    .get<void>('/api/deactivate', { authWorkspace: Workspace.Personal })
    .then(() => {
      notificationsService.show(i18n.get('success.accountDeactivationEmailSent'), ToastType.Info);
    })
    .catch((err) => {
      notificationsService.show(i18n.get('error.deactivatingAccount'), ToastType.Warning);
      console.log(err);
      throw err;
    });
}

export const check2FANeeded = async (email: string): Promise<any> => {
  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/login`, {
    method: 'POST',
    headers: getHeaders(true, true),
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

export const doLogin = async (email: string, password: string, twoFactorCode: string) => {
  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/login`, {
    method: 'post',
    headers: getHeaders(false, false),
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

export const doAccess = async (email: string, password: string, encPass: string, twoFactorCode: string, keys: any) => {
  try {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/access`, {
      method: 'post',
      headers: getHeaders(false, false),
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

export const readReferalCookie = () => {
  const cookie = document.cookie.match(/(^| )REFERRAL=([^;]+)/);

  return cookie ? cookie[2] : null;
};

export const doRegister = async (
  name: string,
  lastname: string,
  email: string,
  password: string,
  referrer?: string,
) => {
  // Setup hash and salt
  const hashObj = passToHash({ password });
  const encPass = encryptText(hashObj.hash);
  const encSalt = encryptText(hashObj.salt);
  // Setup mnemonic
  const mnemonic = bip39.generateMnemonic(256);
  const encMnemonic = encryptTextWithKey(mnemonic, password);

  //Generate keys
  const {
    privateKeyArmored,
    publicKeyArmored: codpublicKey,
    revocationCertificate: codrevocationKey,
  } = await generateNewKeys();

  //Datas
  const encPrivateKey = aes.encrypt(privateKeyArmored, password, getAesInitFromEnv());

  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/register`, {
    method: 'post',
    headers: getHeaders(true, true),
    body: JSON.stringify({
      name: name,
      lastname: lastname,
      email: email,
      password: encPass,
      mnemonic: encMnemonic,
      salt: encSalt,
      referral: readReferalCookie(),
      privateKey: encPrivateKey,
      publicKey: codpublicKey,
      revocationKey: codrevocationKey,
      referrer: referrer,
    }),
  });
  const body = await response.json();

  if (response.status !== 200) {
    throw new Error(body.error ? body.error : 'Internal server error');
  }

  return body;
};

export const updateInfo = async (name: string, lastname: string, email: string, password: string) => {
  // Setup hash and salt
  const hashObj = passToHash({ password });
  const encPass = encryptText(hashObj.hash);
  const encSalt = encryptText(hashObj.salt);

  // Setup mnemonic
  const mnemonic = bip39.generateMnemonic(256);
  const encMnemonic = encryptTextWithKey(mnemonic, password);

  // Body
  const body = {
    name: name,
    lastname: lastname,
    email: email,
    password: encPass,
    mnemonic: encMnemonic,
    salt: encSalt,
    referral: readReferalCookie(),
  };

  const fetchHandler = async (res: Response) => {
    const body = await res.text();

    try {
      const bodyJson = JSON.parse(body);

      return { res: res, data: bodyJson };
    } catch {
      return { res: res, data: body };
    }
  };

  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/appsumo/update`, {
    method: 'POST',
    headers: getHeaders(true, false),
    body: JSON.stringify(body),
  });
  const { res, data } = await fetchHandler(response);

  if (res.status !== 200) {
    throw Error(data.error || 'Internal Server Error');
  }

  const xToken = data.token;
  const xUser = data.user;

  xUser.mnemonic = mnemonic;

  const rootFolderInfo = await userService.initializeUser(email, xUser.mnemonic);

  xUser.root_folder_id = rootFolderInfo.user.root_folder_id;
  localStorageService.set('xToken', xToken);
  localStorageService.set('xMnemonic', mnemonic);
  return xUser;
};

export const getSalt = async (): Promise<any> => {
  const email = localStorageService.getUser()?.email;

  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/login`, {
    method: 'post',
    headers: getHeaders(false, false),
    body: JSON.stringify({ email }),
  });
  const data = await response.json();
  const salt = decryptText(data.sKey);

  return salt;
};

export const changePassword = async (newPassword: string, currentPassword: string, email: string) => {
  const salt = await getSalt();
  const user = localStorageService.getUser() as UserSettings;

  if (!salt) {
    throw new Error('Internal server error. Please reload.');
  }

  // Encrypt the password
  const hashedCurrentPassword = passToHash({ password: currentPassword, salt }).hash;
  const encryptedCurrentPassword = encryptText(hashedCurrentPassword);

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
    headers: getHeaders(true, true),
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

export const userHas2FAStored = async (): Promise<any> => {
  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/login`, {
    method: 'POST',
    headers: getHeaders(true, false),
    body: JSON.stringify({ email: JSON.parse(localStorage.xUser).email }),
  });
  const data = await response.json();
  const has2FA = typeof data.tfa == 'boolean' ? data : false;

  return has2FA;
};

export const generateNew2FA = async (): Promise<any> => {
  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/tfa`, {
    method: 'GET',
    headers: getHeaders(true, false),
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
    headers: getHeaders(true, false),
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

export const store2FA = async (code: string, twoFactorCode: string): Promise<void> => {
  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/tfa`, {
    method: 'PUT',
    headers: getHeaders(true, false),
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
  doRegister,
  check2FANeeded,
  readReferalCookie,
  cancelAccount,
};

export default authService;
