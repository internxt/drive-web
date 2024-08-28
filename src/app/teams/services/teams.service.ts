import httpService from '../../core/services/http.service';
import { InfoInvitationsMembers, TeamsSettings } from '../types';

export async function getTeamsInfo(): Promise<{ userTeam: TeamsSettings; tokenTeams: string }> {
  return fetch(`${process.env.REACT_APP_API_URL}/teams/info`, {
    method: 'get',
    headers: httpService.getHeaders(true, false, false),
  })
    .then((res) => {
      return res.json();
    })
    .catch(() => {
      throw new Error('Can not get info team');
    });
}

export async function getKeys(mail: string): Promise<{ publicKey: string }> {
  return fetch(`${process.env.REACT_APP_API_URL}/user/keys/${mail}`, {
    method: 'GET',
    headers: httpService.getHeaders(true, false),
  }).then(async (res) => {
    if (res.status === 400) {
      const res1 = await res.json();

      throw res1;
    }

    if (res.status !== 200) {
      throw new Error('This user cannot be invited');
    }
    return res.json();
  });
}

export function getMembers(): Promise<InfoInvitationsMembers[]> {
  return fetch(`${process.env.REACT_APP_API_URL}/teams/members`, {
    method: 'get',
    headers: httpService.getHeaders(true, false),
  })
    .then((response) => {
      return response.json();
    })
    .catch((err) => {
      throw err;
    });
}

export function removeMember(item: InfoInvitationsMembers): Promise<void> {
  const typeMember = item.isMember ? 'member' : 'invitation';

  return fetch(`${process.env.REACT_APP_API_URL}/teams/${typeMember}`, {
    method: 'delete',
    headers: httpService.getHeaders(true, false),
    body: JSON.stringify({
      item: item,
    }),
  })
    .then((res) => {
      if (res.status !== 200) {
        throw new Error(`Can not delete this ${typeMember}`);
      }
    })
    .catch((err) => {
      throw err;
    });
}

const teamsService = {
  getTeamsInfo,
  getKeys,
};

export default teamsService;
