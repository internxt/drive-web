import envService from '../../core/services/env.service';
import httpService from '../../core/services/http.service';
import localStorageService from '../../core/services/local-storage.service';
import { Workspace } from '../../core/types';
import { decryptPGP, encryptPGPInvitations } from '../../crypto/services/utilspgp';
import { InfoInvitationsMembers, TeamsSettings } from '../types';

export async function getTeamsInfo(): Promise<{ userTeam: TeamsSettings; tokenTeams: string }> {
  return fetch(`${process.env.REACT_APP_API_URL}/api/teams/info`, {
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
  return fetch(`${process.env.REACT_APP_API_URL}/api/user/keys/${mail}`, {
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

export async function storeTeamsInfo(): Promise<void> {
  try {
    const { userTeam, tokenTeams } = await getTeamsInfo();

    if (userTeam && tokenTeams) {
      const mnemonic = await decryptPGP(Buffer.from(userTeam.bridge_mnemonic, 'base64').toString());

      userTeam.bridge_mnemonic = mnemonic.data.toString();

      localStorageService.set('xTeam', JSON.stringify(userTeam));
      localStorageService.set('xTokenTeam', tokenTeams);
    } else {
      localStorageService.removeItem('xTeam');
      localStorageService.removeItem('xTokenTeam');
    }
  } catch (err: unknown) {
    throw new Error('Can not get info team');
  }
}

export function getMembers(): Promise<InfoInvitationsMembers[]> {
  return fetch(`${process.env.REACT_APP_API_URL}/api/teams/members`, {
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

  return fetch(`${process.env.REACT_APP_API_URL}/api/teams/${typeMember}`, {
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

export async function sendEmailTeamsMember(mail: string): Promise<void> {
  const { publicKey } = await getKeys(mail);
  const xTeam = localStorageService.getTeams() as TeamsSettings;

  //Datas
  const bridgePass = xTeam.bridge_password;
  const mnemonicTeam = xTeam.bridge_mnemonic;

  //Encrypt
  const EncryptBridgePass = await encryptPGPInvitations(bridgePass, publicKey);
  const EncryptMnemonicTeam = await encryptPGPInvitations(mnemonicTeam, publicKey);

  const base64bridge_password = Buffer.from(EncryptBridgePass).toString('base64');
  const base64Mnemonic = Buffer.from(EncryptMnemonicTeam).toString('base64');
  const bridgeuser = xTeam.bridge_user;

  await fetchInvitation(mail, base64bridge_password, base64Mnemonic, bridgeuser);
}

const fetchInvitation = (email: string, bridgePass: string, mnemonicTeam: string, bridgeuser: string) => {
  return fetch(`${process.env.REACT_APP_API_URL}/api/teams/team/invitations`, {
    method: 'POST',
    headers: httpService.getHeaders(true, false, true),
    body: JSON.stringify({
      email,
      bridgePass,
      mnemonicTeam,
      bridgeuser,
    }),
  })
    .then((invitation) => {
      if (invitation.status !== 200) {
        throw new Error('Can not invite this member');
      }
      return invitation.json();
    })
    .catch((err) => {
      throw err;
    });
};

function getTeamInfoStripeSuccess() {
  return httpService.get<TeamsSettings>('/api/teams/team/info', { authWorkspace: Workspace.Individuals });
}

export async function checkSessionStripe(
  sessionId: string,
): Promise<void | { userTeams: TeamsSettings; tokenTeams: string }> {
  const userTeam = await getTeamInfoStripeSuccess();
  const mnemonic = await decryptPGP(Buffer.from(userTeam.bridge_mnemonic, 'base64').toString());

  return httpService
    .post<{ checkoutSessionId: string; test: boolean; mnemonic: string }, void>(
      '/api/teams/checkout/session',
      {
        checkoutSessionId: sessionId,
        test: !envService.isProduction(),
        mnemonic: mnemonic.data.toString(),
      },
      { authWorkspace: Workspace.Individuals },
    )
    .then(() => storeTeamsInfo());
}

const teamsService = {
  getTeamsInfo,
  getKeys,
  storeTeamsInfo,
  sendEmailTeamsMember,
  checkSessionStripe,
};

export default teamsService;
