import httpService from '../../core/services/http.service';
import { UserSettings } from '../types';
import { createUsersClient } from '../../../factory/modules';

export interface InitializeUserResponse {
  user: {
    email: string;
    bucket: string;
    mnemonic: string;
    root_folder_id: number;
  };
}

export async function initializeUser(email: string, mnemonic: string): Promise<InitializeUserResponse | undefined> {
  return httpService.post<{ email: string; mnemonic: string }, InitializeUserResponse | undefined>('/api/initialize', {
    email,
    mnemonic,
  });
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
