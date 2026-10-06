import { RegisterDetails } from '@internxt/sdk';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

import { readReferalCookie, RegisterFunction } from 'services/auth.service';
import { SdkFactory } from '../../../app/core/factory/sdk';
import { decryptTextWithKey } from '../../../app/crypto/services/utils';
import { generateCaptchaToken } from 'utils';
import { generateNewAccountCredentials } from '../utils/generateNewAccountCredentials';

type RegisterPreCreatedUser = (
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

export function useSignUp(referrer?: string): {
  doRegister: RegisterFunction;
  doRegisterPreCreatedUser: RegisterPreCreatedUser;
} {
  const doRegister = async (email: string, password: string, captcha: string) => {
    const authClient = SdkFactory.getNewApiInstance().createAuthClient();

    const registerDetails = await generateRegisterDetails(email, password, captcha);

    const data = await authClient.register(registerDetails);
    const { token, newToken } = data;
    // TODO: need to update user type of register to include bucket field
    const user = data.user as unknown as UserSettings;
    user.mnemonic = decryptTextWithKey(user.mnemonic, password);

    return {
      xUser: user,
      xToken: token,
      xNewToken: newToken,
      mnemonic: user.mnemonic,
    };
  };

  const doRegisterPreCreatedUser = async (email: string, password: string, invitationId: string, captcha: string) => {
    const captchaToken = await generateCaptchaToken();
    const authClient = SdkFactory.getNewApiInstance().createAuthClient({
      captchaToken,
    });

    const registerDetails = await generateRegisterDetails(email, password, captcha);

    const data = await authClient.registerPreCreatedUser({ ...registerDetails, invitationId });
    const { token, newToken, user } = data;

    user.mnemonic = decryptTextWithKey(user.mnemonic, password);

    return {
      xUser: {
        ...user,
        rootFolderId: user.rootFolderUuid ?? user.rootFolderId,
      },
      xToken: token,
      xNewToken: newToken,
      mnemonic: user.mnemonic,
    };
  };

  const generateRegisterDetails = async (
    email: string,
    password: string,
    captcha: string,
  ): Promise<RegisterDetails> => {
    const credentials = await generateNewAccountCredentials(password);
    const registerDetails: RegisterDetails = {
      ...credentials,
      email: email.toLowerCase(),
      captcha: captcha,
      referral: readReferalCookie(),
      referrer: referrer,
    };

    return registerDetails;
  };

  return { doRegister, doRegisterPreCreatedUser };
}
