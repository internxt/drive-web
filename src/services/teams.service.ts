import { getHeaders } from '../lib/auth';
import localStorageService from './local-storage.service';
import { decryptPGP, encryptPGPInvitations } from '../lib/utilspgp';
import { InfoInvitationsMembers, TeamsSettings } from '../models/interfaces';

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

export async function getKeys(mail: string): Promise<any> {
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
      localStorageService.removeItem('xTeam');
      localStorageService.removeItem('xTokenTeam');
    }
  } catch (error) {
    throw new Error ('Can not get info team');
  }
}

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

export async function sendEmailTeamsMember(mail: string): Promise<void> {
  try {
    const key = await getKeys(mail);
    const xTeam = localStorageService.getTeams() as TeamsSettings;

    //Datas
    const bridgePass = xTeam.bridge_password;
    const mnemonicTeam = xTeam.bridge_mnemonic;

    //Encrypt
    const EncryptBridgePass = await encryptPGPInvitations(bridgePass, key.publicKey);
    const EncryptMnemonicTeam = await encryptPGPInvitations(mnemonicTeam, key.publicKey);

    const base64bridge_password = Buffer.from(EncryptBridgePass.data).toString('base64');
    const base64Mnemonic = Buffer.from(EncryptMnemonicTeam.data).toString('base64');
    const bridgeuser = xTeam.bridge_user;

    await fetchInvitation(mail, base64bridge_password, base64Mnemonic, bridgeuser);

  } catch (error) {
    throw error;
  }

}

const fetchInvitation = (email: string, bridgePass: string, mnemonicTeam: string, bridgeuser: string) => {
  return fetch('/api/teams/team/invitations', {
    method: 'POST',
    headers: getHeaders(true, false, true),
    body: JSON.stringify({
      email,
      bridgePass,
      mnemonicTeam,
      bridgeuser
    })
  }).then(invitation => {
    if (invitation.status !== 200) {
      throw new Error('Can not invite this member');
    }
    return invitation.json();
  }).catch((err) => {
    throw err;
  });
};

const teamsService = {
  getTeamsInfo,
  getKeys,
  storeTeamsInfo,
  sendEmailTeamsMember
};

export default teamsService;