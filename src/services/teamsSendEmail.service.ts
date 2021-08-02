import notify from '../components/Notifications';
import { getHeaders } from '../lib/auth';
import { encryptPGPInvitations } from '../lib/utilspgp';
import localStorageService from './localStorage.service';
import { getKeys } from './teams.service';

export async function sendEmailTeamsMember(mail: string): Promise<void> {
  try {
    const key = await getKeys(mail);

    const xTeam = localStorageService.getTeams();
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