import { getHeaders } from '../lib/auth';
import Settings from '../lib/settings';

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

export function isUserSignedIn() {
  const xUser = Settings.get('xUser');
  const xMnemonic = Settings.get('xMnemonic');
  const xToken = Settings.get('xToken');

  return xUser && xMnemonic && xToken;
}