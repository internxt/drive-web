import { getHeaders } from '../lib/auth';
import { decryptPGP } from '../lib/utilspgp';
import { TeamsSettings } from '../models/interfaces';
import { storeTeamsInfo } from './teams.service';

export function getTeamInfo(): Promise<TeamsSettings> {
  return fetch(`${process.env.REACT_APP_API_URL}/api/teams/team/info`, {
    method: 'get',
    headers: getHeaders(true, false, false),
  }).then((res) => {
    if (res.status !== 200) {
      throw Error();
    }
    return res.json();
  });
}

export async function checkSessionStripe(sessionId: string): Promise<void> {
  const userTeam = await getTeamInfo();

  const mnemonic = await decryptPGP(Buffer.from(userTeam.bridge_mnemonic, 'base64').toString());

  return fetch(`${process.env.REACT_APP_API_URL}/api/teams/checkout/session`, {
    method: 'post',
    headers: getHeaders(true, false),
    body: JSON.stringify({
      checkoutSessionId: sessionId,
      test: process.env.NODE_ENV !== 'production',
      mnemonic: mnemonic.data,
    }),
  })
    .then((res) => {
      if (res.status !== 200) {
        throw Error(res.statusText);
      }
      return res.json();
    })
    .then(() => storeTeamsInfo());
}
