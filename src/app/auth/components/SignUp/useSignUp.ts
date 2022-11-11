import { aes } from '@internxt/lib';
import * as bip39 from 'bip39';
import { Keys, RegisterDetails } from '@internxt/sdk';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

import { readReferalCookie } from 'app/auth/services/auth.service';
import { SdkFactory } from 'app/core/factory/sdk';
import httpService from 'app/core/services/http.service';
import { getAesInitFromEnv } from 'app/crypto/services/keys.service';
import { generateNewKeys } from 'app/crypto/services/pgp.service';
import { decryptTextWithKey, encryptText, encryptTextWithKey, passToHash } from 'app/crypto/services/utils';
import analyticsService from 'app/analytics/services/analytics.service';

type UpdateInfoFunction = (
  email: string,
  password: string,
) => Promise<{
  xUser: UserSettings;
  xToken: string;
  mnemonic: string;
}>;
type RegisterFunction = (
  email: string,
  password: string,
  captcha: string,
) => Promise<{
  xUser: UserSettings;
  xToken: string;
  mnemonic: string;
}>;

export function useSignUp(
  registerSource: 'activate' | 'appsumo',
  referrer?: string,
): {
  updateInfo: UpdateInfoFunction;
  doRegister: RegisterFunction;
} {
  const updateInfo: UpdateInfoFunction = async (email: string, password: string) => {
    // Setup hash and salt
    const hashObj = passToHash({ password });
    const encPass = encryptText(hashObj.hash);
    const encSalt = encryptText(hashObj.salt);

    // Setup mnemonic
    const mnemonic = bip39.generateMnemonic(256);
    const encMnemonic = encryptTextWithKey(mnemonic, password);

    const registerUserPayload = {
      email: email.toLowerCase(),
      password: encPass,
      mnemonic: encMnemonic,
      salt: encSalt,
      referral: readReferalCookie(),
    };

    const fetchHandler = async (res: Response) => {
      const body = await res.text();

      try {
        return { res, body: JSON.parse(body) };
      } catch {
        return { res, body };
      }
    };

    const raw = await fetch(`${process.env.REACT_APP_API_URL}/api/${registerSource}/update`, {
      method: 'POST',
      headers: httpService.getHeaders(true, false),
      body: JSON.stringify(registerUserPayload),
    });
    const { res, body } = await fetchHandler(raw);

    if (res.status !== 200) {
      throw Error('Email adress already used');
    }
    const { token: xToken, user: xUser } = body;

    xUser.mnemonic = mnemonic;

    return { xUser, xToken, mnemonic };
  };

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
      email: email,
      password: encPass,
      salt: encSalt,
      mnemonic: encMnemonic,
      keys: keys,
      captcha: captcha,
      referral: readReferalCookie(),
      referrer: referrer,
    };

    const data: any = await authClient.register(registerDetails).catch((err) => {
      analyticsService.trackSignUpError(email, err.message);
    });

    const { token } = data;
    const user: UserSettings = data.user as unknown as UserSettings;

    // user.privateKey = Buffer.from(aes.decrypt(user.privateKey, password)).toString('base64');
    user.mnemonic = decryptTextWithKey(user.mnemonic, password);

    return { xUser: user, xToken: token, mnemonic: user.mnemonic };
  };

  return { updateInfo, doRegister };
}
