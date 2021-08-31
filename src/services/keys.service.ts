import { isValidBase64 } from '../lib/utilspgp';
import { aes } from '@internxt/lib';

export async function validateFormat(
  privateKey: string,
  password: string,
): Promise<{ update: boolean; newPrivKey: string; privkeyDecrypted: string }> {
  let privkeyDecrypted, newPrivKey;
  let update = false;

  try {
    privkeyDecrypted = aes.decrypt(privateKey, password);
  } catch {
    privkeyDecrypted = aes.decrypt(privateKey, password, 9999);
    newPrivKey = aes.encrypt(privkeyDecrypted, password, getAesInitFromEnv());
    update = true;
  }

  const isBase64 = await isValidBase64(privkeyDecrypted);

  if (isBase64) {
    privkeyDecrypted = Buffer.from(privkeyDecrypted, 'base64').toString();
    newPrivKey = aes.encrypt(privkeyDecrypted, password, getAesInitFromEnv());
    update = true;
  }

  return { update, newPrivKey, privkeyDecrypted };
}

export function getAesInitFromEnv(): { iv: string; salt: string } {
  const { REACT_APP_MAGIC_IV: MAGIC_IV, REACT_APP_MAGIC_SALT: MAGIC_SALT } = process.env;

  return { iv: MAGIC_IV as string, salt: MAGIC_SALT as string };
}
