import AesFunctions from '../lib/AesUtil';
import { getHeaders } from '../lib/auth';
import Settings from '../lib/settings';
import { generateNewKeys } from './pgp.service';

export async function initializeUser(email: string, mnemonic: string, password:string) {
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

export async function initializeKeys(password: string, email: string) {
  const { publicKeyArmored, privateKeyArmored, revocationCertificate } = await generateNewKeys();

  const privateKeyEncrypted = AesFunctions.encrypt(privateKeyArmored, password, false);

  return fetch('/api/access', {
    method: 'post',
    headers: getHeaders(false, false),
    body: JSON.stringify({
      email: email,
      password: password,
      privateKey: privateKeyEncrypted,
      publicKey: publicKeyArmored,
      revocateKey: revocationCertificate
    })
  }).then(async res => {
    return { res, data: await res.json() };
  }).then(async user => {
    Settings.set('xUser', JSON.stringify(user.data.user));
  });
}

export function isUserSignedIn() {
  const xUser = Settings.get('xUser');
  const xMnemonic = Settings.get('xMnemonic');
  const xToken = Settings.get('xToken');

  return xUser && xMnemonic && xToken;
}