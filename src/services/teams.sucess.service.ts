import { getHeaders } from '../lib/auth';
import { decryptPGP } from '../lib/utilspgp';
import envService from './env.service';
import { storeTeamsInfo } from './teams.service';

export function getTeamInfo() {
  return fetch('/api/teams/team/info', {
    method: 'get',
    headers: getHeaders(true, false, false)
  }).then(res => {
    if (res.status !== 200) {
      throw Error();
    }
    return res.json();
  }).catch(() => {
    return {};
  });
}

export async function checkSessionStripe(sessionId: string) {
  const userTeam = await getTeamInfo();

  const mnemonic = await decryptPGP(Buffer.from(userTeam.bridge_mnemonic, 'base64').toString());

  return fetch('/api/teams/checkout/session', {
    method: 'post',
    headers: getHeaders(true, false),
    body: JSON.stringify({
      checkoutSessionId: sessionId,
      test: !envService.isProduction(),
      mnemonic: mnemonic.data
    })
  }).then((res) => {
    if (res.status !== 200) {
      throw Error(res.statusText);
    }
    return res.json();
  }).then(() => storeTeamsInfo())
    .catch((err) => {
    });
}