import { getHeaders } from '../lib/auth';
import Settings from '../lib/settings';
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
  }).then((response) => {
    return response.json();
  });
}

export async function storeTeamsInfo() {
  const { userTeam, tokenTeams } = await getTeamsInfo();

  if (userTeam && tokenTeams) {
    const mnemonic = await decryptPGP(Buffer.from(userTeam.bridge_mnemonic, 'base64').toString());

    userTeam.bridge_mnemonic = mnemonic.data;

    Settings.set('xTeam', JSON.stringify(userTeam));
    Settings.set('xTokenTeam', tokenTeams);
  } else {
    Settings.del('xTeam');
    Settings.del('xTokenTeam');
  }
}

export async function existsUserToInvite(mail: string) {
  return fetch('/api/teams/user', {
    method: 'post',
    headers: getHeaders(true, false, false),
    body: JSON.stringify({ email: mail })
  }).then(res => {
    if (res.status === 200) {
      return true;
    }
    return false;
  });
}