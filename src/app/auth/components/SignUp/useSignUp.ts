import { aes } from '@internxt/lib';
import { Keys, RegisterDetails } from '@internxt/sdk';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import * as bip39 from 'bip39';

import { readReferalCookie } from 'app/auth/services/auth.service';
import { SdkFactory } from 'app/core/factory/sdk';
import { getAesInitFromEnv } from 'app/crypto/services/keys.service';
import { generateNewKeys } from 'app/crypto/services/pgp.service';
import { decryptTextWithKey, encryptText, encryptTextWithKey, passToHash } from 'app/crypto/services/utils';

export type RegisterFunction = (
  email: string,
  password: string,
  captcha: string,
) => Promise<{
  xUser: UserSettings;
  xToken: string;
  mnemonic: string;
}>;

type RegisterPreCreatedUser = (
  email: string,
  password: string,
  invitationId: string,
  captcha: string,
) => Promise<{
  xUser: UserSettings;
  xToken: string;
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

    const { privateKeyArmored, publicKeyArmored, revocationCertificate } = await generateNewKeys();
    const encPrivateKey = aes.encrypt(privateKeyArmored, password, getAesInitFromEnv());

    const authClient = SdkFactory.getNewApiInstance().createAuthClient();

    const keys: Keys = {
      privateKeyEncrypted: encPrivateKey,
      publicKey: publicKeyArmored,
      revocationCertificate: revocationCertificate,
    };
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
    const { token } = data;
    const user: UserSettings = data.user as unknown as UserSettings;

    // user.privateKey = Buffer.from(aes.decrypt(user.privateKey, password)).toString('base64');
    user.mnemonic = decryptTextWithKey(user.mnemonic, password);

    return { xUser: user, xToken: token, mnemonic: user.mnemonic };
  };

  const doRegisterPreCreatedUser = async (email: string, password: string, invitationId: string, captcha: string) => {
    const authClient = SdkFactory.getNewApiInstance().createAuthClient();

    const registerDetails = await generateRegisterDetails(email, password, captcha);

    const data = await authClient.registerPreCreatedUser({ ...registerDetails, invitationId });
    const { token } = data;
    const user = data.user as UserSettings;

    user.mnemonic = decryptTextWithKey(user.mnemonic, password);

    return {
      xUser: {
        ...user,
        rootFolderId: user.rootFolderUuid ?? user.rootFolderId,
      },
      xToken: token,
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

    const { privateKeyArmored, publicKeyArmored, revocationCertificate } = await generateNewKeys();
    const encPrivateKey = aes.encrypt(privateKeyArmored, password, getAesInitFromEnv());

    const keys: Keys = {
      privateKeyEncrypted: encPrivateKey,
      publicKey: publicKeyArmored,
      revocationCertificate: revocationCertificate,
    };
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
