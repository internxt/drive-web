import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { createAuthClient, createUsersClient } from '../../../factory/modules';
import { InitializeUserResponse } from '@internxt/sdk/dist/drive/users/types';

export async function initializeUser(email: string, mnemonic: string): Promise<InitializeUserResponse> {
  return createUsersClient().initialize(email, mnemonic);
}

export const sendDeactivationEmail = (email: string): Promise<void> => {
  return createAuthClient().sendDeactivationEmail(email);
};

const inviteAFriend = (email: string): Promise<void> => {
  return createUsersClient().sendInvitation(email);
};

/**
 * ! This endpoint accepts a body but is using GET method
 */
const refreshUser = async (): Promise<{ user: UserSettings; token: string }> => {
  return createUsersClient().refreshUser();
};

const userService = {
  initializeUser,
  refreshUser,
  sendDeactivationEmail,
  inviteAFriend,
};

export default userService;
