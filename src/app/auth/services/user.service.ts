import {
  CheckChangeEmailExpirationResponse,
  FriendInvite,
  InitializeUserResponse,
  PreCreateUserResponse,
  UpdateProfilePayload,
  UserPublicKeyResponse,
  VerifyEmailChangeResponse,
} from '@internxt/sdk/dist/drive/users/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { SdkFactory } from '../../core/factory/sdk';
import envService from 'app/core/services/env.service';
import localStorageService from 'app/core/services/local-storage.service';

const TEMPORAL_AVATAR_API_URL = envService.isProduction() ? process.env.REACT_APP_AVATAR_URL : undefined;

export async function initializeUser(email: string, mnemonic: string): Promise<InitializeUserResponse> {
  const usersClient = SdkFactory.getInstance().createUsersClient();
  return usersClient.initialize(email, mnemonic);
}

export const sendDeactivationEmail = (): Promise<void> => {
  const authClient = SdkFactory.getNewApiInstance().createAuthClient();
  const token = localStorageService.get('xNewToken') ?? undefined;
  return authClient.sendUserDeactivationEmail(token);
};

const preCreateUser = (email: string): Promise<PreCreateUserResponse> => {
  const usersClient = SdkFactory.getNewApiInstance().createNewUsersClient();
  return usersClient.preRegister(email);
};

/**
 * ! This endpoint accepts a body but is using GET method
 */
const refreshUser = async (): Promise<{ user: UserSettings; token: string }> => {
  const usersClient = SdkFactory.getInstance().createUsersClient();
  return usersClient.refreshUser();
};

const refreshUserData = async (userUUID: string): Promise<{ user: UserSettings }> => {
  const usersClient = SdkFactory.getNewApiInstance().createNewUsersClient();
  return usersClient.getUserData({ userUuid: userUUID });
};

const updateUserProfile = (payload: Required<UpdateProfilePayload>): Promise<void> => {
  const usersClient = SdkFactory.getNewApiInstance().createUsersClient();
  const token = localStorageService.get('xNewToken') ?? undefined;
  return usersClient.updateUserProfile(payload, token);
};

const getFriendInvites = (): Promise<FriendInvite[]> => {
  const usersClient = SdkFactory.getInstance().createUsersClient();
  return usersClient.getFriendInvites();
};

const updateUserAvatar = (payload: { avatar: Blob }): Promise<{ avatar: string }> => {
  const usersClient = SdkFactory.getInstance().createUsersClient(TEMPORAL_AVATAR_API_URL);
  return usersClient.updateAvatar(payload);
};

const deleteUserAvatar = (): Promise<void> => {
  const usersClient = SdkFactory.getNewApiInstance().createUsersClient();
  const token = localStorageService.get('xNewToken') ?? undefined;
  return usersClient.deleteUserAvatar(token);
};

const sendVerificationEmail = (): Promise<void> => {
  const usersClient = SdkFactory.getNewApiInstance().createUsersClient();
  const token = localStorageService.get('xNewToken') ?? undefined;
  return usersClient.sendVerificationEmail(token);
};

const getPublicKeyByEmail = (email: string): Promise<UserPublicKeyResponse> => {
  const usersClient = SdkFactory.getNewApiInstance().createNewUsersClient();
  return usersClient.getPublicKeyByEmail({ email });
};

const changeEmail = (newEmail: string): Promise<void> => {
  const authClient = SdkFactory.getNewApiInstance().createNewUsersClient();
  return authClient.changeUserEmail(newEmail);
};

const verifyEmailChange = (verifyToken: string): Promise<VerifyEmailChangeResponse> => {
  const authClient = SdkFactory.getNewApiInstance().createNewUsersClient();
  return authClient.verifyEmailChange(verifyToken);
};

const checkChangeEmailLinkExpiration = (verifyToken: string): Promise<CheckChangeEmailExpirationResponse> => {
  const authClient = SdkFactory.getNewApiInstance().createNewUsersClient();
  return authClient.checkChangeEmailExpiration(verifyToken);
};

const userService = {
  initializeUser,
  refreshUser,
  sendDeactivationEmail,
  updateUserProfile,
  getFriendInvites,
  updateUserAvatar,
  deleteUserAvatar,
  sendVerificationEmail,
  getPublicKeyByEmail,
  changeEmail,
  verifyEmailChange,
  checkChangeEmailLinkExpiration,
  preCreateUser,
  refreshUserData,
};

export default userService;
