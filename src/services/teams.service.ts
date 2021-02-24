import { getHeaders } from '../lib/auth';
import Settings from '../lib/settings';

export async function getTeamsInfo() {
  return fetch('/api/teams/info', {
    method: 'get',
    headers: getHeaders(true, false, false)
  }).then(res => res.json());
}

export async function storeTeamsInfo() {
  const { userTeam, tokenTeams } = await getTeamsInfo();

  if (userTeam && tokenTeams) {
    Settings.set('xTeam', userTeam);
    Settings.set('xTokenTeam', tokenTeams);
  }
}