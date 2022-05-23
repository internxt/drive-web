import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { SdkFactory } from '../../core/factory/sdk';
import { FriendInvite, InitializeUserResponse, UpdateProfilePayload } from '@internxt/sdk/dist/drive/users/types';

export async function initializeUser(email: string, mnemonic: string): Promise<InitializeUserResponse> {
  const usersClient = SdkFactory.getInstance().createUsersClient();
  return usersClient.initialize(email, mnemonic);
}

export const sendDeactivationEmail = (email: string): Promise<void> => {
  const authClient = SdkFactory.getInstance().createAuthClient();
  return authClient.sendDeactivationEmail(email);
};

const inviteAFriend = (email: string): Promise<void> => {
  const usersClient = SdkFactory.getInstance().createUsersClient();
  return usersClient.sendInvitation(email);
};

/**
 * ! This endpoint accepts a body but is using GET method
 */
const refreshUser = async (): Promise<{ user: UserSettings; token: string }> => {
  const usersClient = SdkFactory.getInstance().createUsersClient();
  return usersClient.refreshUser();
};

const updateUserProfile = (payload: Required<UpdateProfilePayload>): Promise<void> => {
  const usersClient = SdkFactory.getInstance().createUsersClient();
  return usersClient.updateProfile(payload);
};

const getFriendInvites = (): Promise<FriendInvite[]> => {
  const usersClient = SdkFactory.getInstance().createUsersClient();
  return usersClient.getFriendInvites();
};

const updateUserAvatar = (payload: { avatar: Blob }): Promise<{ avatar: string }> => {
  const usersClient = SdkFactory.getInstance().createUsersClient();
  return usersClient.updateAvatar(payload);
};

const deleteUserAvatar = (): Promise<void> => {
  const usersClient = SdkFactory.getInstance().createUsersClient();
  return usersClient.deleteAvatar();
};

const userService = {
  initializeUser,
  refreshUser,
  sendDeactivationEmail,
  inviteAFriend,
  updateUserProfile,
  getFriendInvites,
  updateUserAvatar,
  deleteUserAvatar,
};

export default userService;
