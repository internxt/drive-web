import {
  CheckChangeEmailExpirationResponse,
  PreCreateUserResponse,
  UpdateProfilePayload,
  UserPublicKeyResponse,
  UserPublicKeyWithCreationResponse,
  VerifyEmailChangeResponse,
} from '@internxt/sdk/dist/drive/users/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import localStorageService from 'app/core/services/local-storage.service';
import { SdkFactory } from '../app/core/factory/sdk';

export const sendDeactivationEmail = (): Promise<void> => {
  const authClient = SdkFactory.getNewApiInstance().createAuthClient();
  const token = localStorageService.get('xNewToken') ?? undefined;
  return authClient.sendUserDeactivationEmail(token);
};

const preCreateUser = (email: string): Promise<PreCreateUserResponse> => {
  const usersClient = SdkFactory.getNewApiInstance().createUsersClient();
  return usersClient.preRegister(email);
};

const refreshUserData = async (
  userUUID: string,
): Promise<{
  newToken: string;
  oldToken: string;
  user: UserSettings;
}> => {
  const usersClient = SdkFactory.getNewApiInstance().createUsersClient();
  return usersClient.getUserData({ userUuid: userUUID });
};

const refreshAvatarUser = async (): Promise<{
  avatar: string | null;
}> => {
  const usersClient = SdkFactory.getNewApiInstance().createUsersClient();
  return usersClient.refreshAvatarUser();
};

const updateUserProfile = (payload: Required<UpdateProfilePayload>): Promise<void> => {
  const usersClient = SdkFactory.getNewApiInstance().createUsersClient();
  const token = localStorageService.get('xNewToken') ?? undefined;
  return usersClient.updateUserProfile(payload, token);
};

const updateUserAvatar = (payload: { avatar: Blob }): Promise<{ avatar: string }> => {
  const usersClient = SdkFactory.getNewApiInstance().createUsersClient();
  return usersClient.updateUserAvatar(payload);
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
  const usersClient = SdkFactory.getNewApiInstance().createUsersClient();
  return usersClient.getPublicKeyByEmail({ email });
};

const getPublicKeyWithPrecreation = (email: string): Promise<UserPublicKeyWithCreationResponse> => {
  const usersClient = SdkFactory.getNewApiInstance().createUsersClient();
  return usersClient.getPublicKeyWithPrecreation({ email });
};

const changeEmail = (newEmail: string): Promise<void> => {
  const authClient = SdkFactory.getNewApiInstance().createUsersClient();
  return authClient.changeUserEmail(newEmail);
};

const verifyEmailChange = (verifyToken: string): Promise<VerifyEmailChangeResponse> => {
  const authClient = SdkFactory.getNewApiInstance().createUsersClient();
  return authClient.verifyEmailChange(verifyToken);
};

const checkChangeEmailLinkExpiration = (verifyToken: string): Promise<CheckChangeEmailExpirationResponse> => {
  const authClient = SdkFactory.getNewApiInstance().createUsersClient();
  return authClient.checkChangeEmailExpiration(verifyToken);
};

const downloadAvatar = async (url: string, signal?: AbortSignal): Promise<Blob> => {
  const response = await fetch(url, { signal });
  const data = await response.blob();
  return data;
};

const userService = {
  sendDeactivationEmail,
  updateUserProfile,
  updateUserAvatar,
  deleteUserAvatar,
  sendVerificationEmail,
  getPublicKeyByEmail,
  getPublicKeyWithPrecreation,
  changeEmail,
  verifyEmailChange,
  checkChangeEmailLinkExpiration,
  preCreateUser,
  refreshUserData,
  refreshAvatarUser,
  downloadAvatar,
};

export default userService;
