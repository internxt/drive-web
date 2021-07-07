import { getHeaders } from '../lib/auth';
import localStorageService from '../services/localStorage.service';
import { decryptPGP } from '../lib/utilspgp';

export async function getTeamsInfo() {
  return fetch('/api/teams/info', {
    method: 'get',
    headers: getHeaders(true, false, false)
  }).then(res => res.json());
}

export async function getKeys(mail: string) {
  return fetch(`/api/user/keys/${mail}`, {
    method: 'GET',
    headers: getHeaders(true, false)
  }).then(async(res) =>{
    if (res.status === 400){
      const res1 = await res.json();

      throw res1;
    }

    if (res.status !== 200) {
      throw new Error('This user cannot be invited');
    }
    return res.json();
  });
}

export async function storeTeamsInfo() {
  const { userTeam, tokenTeams } = await getTeamsInfo();

  if (userTeam && tokenTeams) {
    const mnemonic = await decryptPGP(Buffer.from(userTeam.bridge_mnemonic, 'base64').toString());

    userTeam.bridge_mnemonic = mnemonic.data;

    localStorageService.set('xTeam', JSON.stringify(userTeam));
    localStorageService.set('xTokenTeam', tokenTeams);
  } else {
    localStorageService.del('xTeam');
    localStorageService.del('xTokenTeam');
  }
}
