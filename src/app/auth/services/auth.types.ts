import { AuthMethodTypes } from 'app/payment/types';
import { AppDispatch } from 'app/store';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

export type ProfileInfo = {
  user: UserSettings;
  token: string;
  newToken: string;
  mnemonic: string;
};

export type ProfileInfoOpaque = {
  user: UserSettings;
  token: string;
  mnemonic: string;
};

export type LogInParamsOpaque = {
  email: string;
  password: string;
  twoFactorCode: string;
  dispatch: AppDispatch;
};

export type RegisterFunction = (
  email: string,
  password: string,
  captcha: string,
) => Promise<{
  xUser: UserSettings;
  xToken: string;
  xNewToken: string;
  mnemonic: string;
}>;

export type SignUpParamsOpaque = {
  email: string;
  password: string;
  redeemCodeObject: boolean;
  dispatch: AppDispatch;
};

export type SignUpParams = {
  doSignUp: RegisterFunction;
  email: string;
  password: string;
  token: string;
  redeemCodeObject: boolean;
  dispatch: AppDispatch;
};

export type LogInParams = {
  email: string;
  password: string;
  twoFactorCode: string;
  dispatch: AppDispatch;
  loginType?: 'web' | 'desktop';
};

export type AuthenticateUserParams = {
  email: string;
  password: string;
  authMethod: AuthMethodTypes;
  twoFactorCode: string;
  dispatch: AppDispatch;
  loginType?: 'web' | 'desktop';
  token?: string;
  redeemCodeObject?: boolean;
  doSignUp?: RegisterFunction;
};

export type AuthParams = {
  email: string;
  password: string;
  authMethod: AuthMethodTypes;
  captcha: string;
  dispatch: AppDispatch;
  doRegister: RegisterFunction;
};

export type RegisterPreCreatedUser = (
  email: string,
  password: string,
  invitationId: string,
  captcha: string,
) => Promise<{
  xUser: UserSettings;
  xToken: string;
  xNewToken: string;
  mnemonic: string;
}>;
