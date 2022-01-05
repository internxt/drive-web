import httpService from '../../core/services/http.service';
import { UserSettings } from '../types';
import { createUsersClient } from '../../../factory/modules';
import { InitializeUserResponse } from '@internxt/sdk/dist/drive/users/types';

export async function initializeUser(email: string, mnemonic: string): Promise<InitializeUserResponse> {
  return createUsersClient().initialize(email, mnemonic);
}

export const sendDeactivationEmail = (email: string): Promise<void> => {
  return httpService.get<void>(`/api/reset/${email}`);
};

const inviteAFriend = (email: string): Promise<void> => {
  const usersClient = createUsersClient();
  return usersClient.sendInvitation(email);
};

/**
 * ! This endpoint accepts a body but is using GET method
 */
const refreshUser = async (): Promise<{ user: UserSettings; token: string }> => {
  return httpService.get<{ user: UserSettings; token: string }>('/api/user/refresh');
};

const userService = {
  initializeUser,
  refreshUser,
  sendDeactivationEmail,
  inviteAFriend,
};

export default userService;
