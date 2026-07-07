import {
  CheckChangeEmailExpirationResponse,
  PreCreateUserResponse,
  UpdateProfilePayload,
  UserPublicKeyResponse,
  UserPublicKeyWithCreationResponse,
  VerifyEmailChangeResponse,
} from '@internxt/sdk/dist/drive/users/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import localStorageService from 'services/local-storage.service';
import { SdkFactory } from 'app/core/factory/sdk';
import { generateCaptchaToken } from 'utils';

const preCreateUser = async (email: string): Promise<PreCreateUserResponse> => {
  const usersClient = await SdkFactory.getNewApiInstance().createUsersClient();
  return usersClient.preRegister(email);
};

const refreshUserData = async (
  userUUID: string,
): Promise<{
  newToken: string;
  user: UserSettings;
}> => {
  const usersClient = await SdkFactory.getNewApiInstance().createUsersClient();
  return usersClient.getUserData({ userUuid: userUUID });
};

const refreshAvatarUser = async (): Promise<{
  avatar: string | null;
}> => {
  const usersClient = await SdkFactory.getNewApiInstance().createUsersClient();
  return usersClient.refreshAvatarUser();
};

const updateUserProfile = async (payload: Required<UpdateProfilePayload>): Promise<void> => {
  const usersClient = await SdkFactory.getNewApiInstance().createUsersClient();
  const token = await localStorageService.getToken();
  return usersClient.updateUserProfile(payload, token);
};

const updateUserAvatar = async (payload: { avatar: Blob }): Promise<{ avatar: string }> => {
  const usersClient = await SdkFactory.getNewApiInstance().createUsersClient();
  return usersClient.updateUserAvatar(payload);
};

const deleteUserAvatar = async (): Promise<void> => {
  const usersClient = await SdkFactory.getNewApiInstance().createUsersClient();
  const token = await localStorageService.getToken();
  return usersClient.deleteUserAvatar(token);
};

const sendVerificationEmail = async (): Promise<void> => {
  const captchaToken = await generateCaptchaToken();
  const usersClient = await SdkFactory.getNewApiInstance().createUsersClient(captchaToken);
  const token = await localStorageService.getToken();
  return usersClient.sendVerificationEmail(token);
};

const getPublicKeyByEmail = async (email: string): Promise<UserPublicKeyResponse> => {
  const usersClient = await SdkFactory.getNewApiInstance().createUsersClient();
  return usersClient.getPublicKeyByEmail({ email });
};

const getPublicKeyWithPrecreation = async (email: string): Promise<UserPublicKeyWithCreationResponse> => {
  const captchaToken = await generateCaptchaToken();
  const usersClient = await SdkFactory.getNewApiInstance().createUsersClient(captchaToken);
  return usersClient.getPublicKeyWithPrecreation({ email });
};

const changeEmail = async (newEmail: string): Promise<void> => {
  const captchaToken = await generateCaptchaToken();
  const authClient = await SdkFactory.getNewApiInstance().createUsersClient(captchaToken);
  return authClient.changeUserEmail(newEmail);
};

const verifyEmailChange = async (verifyToken: string): Promise<VerifyEmailChangeResponse> => {
  const authClient = await SdkFactory.getNewApiInstance().createUsersClient();
  return authClient.verifyEmailChange(verifyToken);
};

const checkChangeEmailLinkExpiration = async (verifyToken: string): Promise<CheckChangeEmailExpirationResponse> => {
  const authClient = await SdkFactory.getNewApiInstance().createUsersClient();
  return authClient.checkChangeEmailExpiration(verifyToken);
};

const downloadAvatar = async (url: string, signal?: AbortSignal): Promise<Blob> => {
  const response = await fetch(url, { signal });
  const data = await response.blob();
  return data;
};

const sendIncompleteCheckout = async (completeCheckoutUrl: string, planName: string, price?: number): Promise<void> => {
  const usersClient = await SdkFactory.getNewApiInstance().createUsersClient();
  await usersClient.handleIncompleteCheckout({
    completeCheckoutUrl,
    planName,
    price,
  });
};

const userService = {
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
  sendIncompleteCheckout,
};

export default userService;
