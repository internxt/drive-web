import { AppDispatch } from 'app/store';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

export type ProfileInfoOpaque = {
  user: UserSettings;
  sessionID: string;
  sessionKey: string;
  exportKey: string;
};

export type LogInParamsOpaque = {
  email: string;
  password: string;
  twoFactorCode: string;
  dispatch: AppDispatch;
};

export type SignUpParamsOpaque = {
  email: string;
  password: string;
  redeemCodeObject: boolean;
  dispatch: AppDispatch;
};
