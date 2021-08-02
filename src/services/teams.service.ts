import { getHeaders } from '../lib/auth';
import localStorageService from '../services/localStorage.service';
import { decryptPGP } from '../lib/utilspgp';

export function isTeamActivated(): Promise<any> {
  const team: any = localStorage.getTeams();

  return fetch(`/api/team/isactivated/${team.bridge_user}`, {
    method: 'get',
    headers: getHeaders(true, false)
  }).then((response) => response.json())
    .catch(() => {
      console.log('Error getting user activation');
    });
}

export async function getTeamsInfo(): Promise<any> {
  return fetch('/api/teams/info', {
    method: 'get',
    headers: getHeaders(true, false, false)
  }).then(res => {
    return res.json();
  }).catch(() => {
    throw new Error ('Can not get info team');
  });
}

export async function getKeys(mail: string): Promise<Response> {
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

export async function storeTeamsInfo(): Promise<void> {
  try {
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
  } catch (error) {
    throw new Error ('Can not get info team');
  }
}

const teamsService = {
  isTeamActivated,
  getTeamsInfo,
  getKeys,
  storeTeamsInfo
};

export default teamsService;