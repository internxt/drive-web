import { getHeaders } from '../lib/auth';
import localStorageService from '../services/localStorage.service';
import history from '../lib/history';
import analyticsService from './analytics.service';
import React, { SetStateAction } from 'react';
import { validateEmail } from './validation.service';
import { History } from 'history';
import { generateNewKeys, updateKeys } from './pgp.service';
import AesUtils from '../lib/AesUtil';
import { decryptText, decryptTextWithKey, encryptText, passToHash } from '../lib/utils';
import { validateFormat } from './keys.service';
import { storeTeamsInfo } from './teams.service';
import { decryptPGP } from '../lib/utilspgp';
import { setTokenSourceMapRange } from 'typescript';

export async function initializeUser(email: string, mnemonic: string) {
  return fetch('/api/initialize', {
    method: 'POST',
    headers: getHeaders(true, true),
    body: JSON.stringify({
      email: email,
      mnemonic: mnemonic
    })
  }).then(res => {
    if (res.status !== 200) {
      throw Error(res.statusText);
    }
    return res.json();
  });
}

export function logOut() {
  analyticsService.signOut();
  localStorageService.clear();
  localStorageService.del('workspace');
  history.push('/login');
}

export function isUserSignedIn() {
  const xUser = localStorageService.get('xUser');
  const xMnemonic = localStorageService.get('xMnemonic');
  const xToken = localStorageService.get('xToken');

  return xUser && xMnemonic && xToken;
}

export const check2FANeeded = async (email: string): Promise<any> => {
  console.log('check2FANeeded()', email);
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: getHeaders(true, true),
      body: JSON.stringify({ email })
    });

    console.log('2fa response =>', response);
    const data = await response.json();

    console.log('after check2FA fetch =>', data);

    if (response.status !== 200) {
      analyticsService.signInAttempted(email, data.error);
      throw new Error(data.error ? data.error : 'Login error');
    }
    return data;
  } catch (err) {
    throw err;
  }
};

const generateNewKeysWithEncrypted = async (password: string) => {
  const { privateKeyArmored, publicKeyArmored, revocationCertificate } = await generateNewKeys();

  return {
    privateKeyArmored,
    privateKeyArmoredEncrypted: AesUtils.encrypt(privateKeyArmored, password, false),
    publicKeyArmored,
    revocationCertificate
  };
};

export const doLogin = async (email: string, password: string, twoFactorCode: string) => {
  try {
    const response = await fetch('/api/login', {
      method: 'post',
      headers: getHeaders(false, false),
      body: JSON.stringify({ email })
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
  } catch (err) {
    throw err;
  }
};

export const doAccess = async (email: string, password: string, encPass: string, twoFactorCode: string, keys: any) => {
  try {
    const response = await fetch('/api/access', {
      method: 'post',
      headers: getHeaders(false, false),
      body: JSON.stringify({
        email,
        password: encPass,
        tfa: twoFactorCode,
        privateKey: keys.privateKeyArmoredEncrypted,
        publicKey: keys.publicKeyArmored,
        revocateKey: keys.revocationCertificate
      })
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
      revocationKey: revocateKey
    };

    if (user.teams) {
      await storeTeamsInfo();
    }
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
        isAdmin: data.userTeam.isAdmin
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
  } catch (err) {
    throw new Error(`"${err.error ? err.error : err}"`);
  }
};

const authService = {
  initializeUser,
  logOut,
  isUserSignedIn,
  doLogin,
  doAccess,
  check2FANeeded
};

export default authService;