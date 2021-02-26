import { getHeaders } from '../lib/auth';
import Settings from '../lib/settings';
import { decryptPGP } from '../lib/utilspgp';

export async function getTeamsInfo() {
  return fetch('/api/teams/info', {
    method: 'get',
    headers: getHeaders(true, false, false)
  }).then(res => res.json());
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