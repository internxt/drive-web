import { getHeaders } from '../lib/auth';
import { InfoInvitationsMembers } from '../models/interfaces';

export function getMembers(): Promise<InfoInvitationsMembers[]> {
  return fetch('/api/teams/members', {
    method: 'get',
    headers: getHeaders(true, false)
  }).then((response) => {
    return response.json();
  }).catch((err) => {
    throw err;
  });
}

export function removeMember(item: InfoInvitationsMembers): Promise<void> {
  const typeMember = item.isMember ? 'member' : 'invitation';

  return fetch(`/api/teams/${typeMember}`, {
    method: 'delete',
    headers: getHeaders(true, false),
    body: JSON.stringify({
      item: item
    })
  }).then((res) => {
    if (res.status !== 200) {
      throw new Error(`Can not delete this ${typeMember}`);
    }
  }).catch((err) => {
    throw err;
  });
}