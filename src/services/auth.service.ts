import { getHeaders } from '../lib/auth';
import localStorageService from '../services/localStorage.service';

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

export function isUserSignedIn() {
  const xUser = localStorageService.get('xUser');
  const xMnemonic = localStorageService.get('xMnemonic');
  const xToken = localStorageService.get('xToken');

  return xUser && xMnemonic && xToken;
}