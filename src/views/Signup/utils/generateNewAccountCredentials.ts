import { RegisterDetails } from '@internxt/sdk';
import * as bip39 from 'bip39';

import { getKeys } from 'app/crypto/services/keys.service';
import { encryptText, encryptTextWithKey, passToHash } from 'app/crypto/services/utils';

export type NewAccountCredentials = Pick<
  RegisterDetails,
  'name' | 'lastname' | 'password' | 'salt' | 'mnemonic' | 'keys'
>;

const NEW_ACCOUNT_NAME = 'My';
const NEW_ACCOUNT_LASTNAME = 'Internxt';
const MNEMONIC_STRENGTH_BITS = 256;

export const generateNewAccountCredentials = async (password: string): Promise<NewAccountCredentials> => {
  const hashObj = passToHash({ password });
  const mnemonic = bip39.generateMnemonic(MNEMONIC_STRENGTH_BITS);
  const keys = await getKeys(password);

  return {
    name: NEW_ACCOUNT_NAME,
    lastname: NEW_ACCOUNT_LASTNAME,
    password: encryptText(hashObj.hash),
    salt: encryptText(hashObj.salt),
    mnemonic: encryptTextWithKey(mnemonic, password),
    keys,
  };
};
