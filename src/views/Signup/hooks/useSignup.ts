import { RegisterDetails } from '@internxt/sdk';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import * as bip39 from 'bip39';

import { readReferalCookie, RegisterFunction } from 'services/auth.service';
import { SdkFactory } from '../../../app/core/factory/sdk';
import { getKeys } from '../../../app/crypto/services/keys.service';
import { decryptTextWithKey, encryptText, encryptTextWithKey, passToHash } from '../../../app/crypto/services/utils';
import { generateCaptchaToken } from 'utils';

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
    const hashObj = passToHash({ password });
    const encPass = encryptText(hashObj.hash);
    const encSalt = encryptText(hashObj.salt);
    const mnemonic = bip39.generateMnemonic(256);
    const encMnemonic = encryptTextWithKey(mnemonic, password);

    const authClient = SdkFactory.getNewApiInstance().createAuthClient();

    const keys = await getKeys(password);

    const registerDetails: RegisterDetails = {
      name: 'My',
      lastname: 'Internxt',
      email: email.toLowerCase(),
      password: encPass,
      salt: encSalt,
      mnemonic: encMnemonic,
      keys: keys,
      captcha: captcha,
      referral: readReferalCookie(),
      referrer: referrer,
    };

    const data = await authClient.register(registerDetails);
    const { token, newToken, user } = data;
    // TODO: need to update user type of register to include bucket field
    user.mnemonic = decryptTextWithKey(user.mnemonic, password);

    return {
      xUser: {
        ...user,
        bucket: '',
      },
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
    const hashObj = passToHash({ password });
    const encPass = encryptText(hashObj.hash);
    const encSalt = encryptText(hashObj.salt);
    const mnemonic = bip39.generateMnemonic(256);
    const encMnemonic = encryptTextWithKey(mnemonic, password);

    const keys = await getKeys(password);
    const registerDetails: RegisterDetails = {
      name: 'My',
      lastname: 'Internxt',
      email: email.toLowerCase(),
      password: encPass,
      salt: encSalt,
      mnemonic: encMnemonic,
      keys: keys,
      captcha: captcha,
      referral: readReferalCookie(),
      referrer: referrer,
    };

    return registerDetails;
  };

  return { doRegister, doRegisterPreCreatedUser };
}
