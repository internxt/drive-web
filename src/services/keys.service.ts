import AesUtil from '../lib/AesUtil';
import { isValidBase64 } from '../lib/utilspgp';

export async function validateFormat(privateKey: string, password: string) {
  let privkeyDecrypted, newPrivKey;
  let update = false;

  try {
    privkeyDecrypted = AesUtil.decrypt(privateKey, password);
  } catch {
    privkeyDecrypted = AesUtil.decrypt(privateKey, password, 9999);
    newPrivKey = AesUtil.encrypt(privkeyDecrypted, password);
    update = true;
  }

  const isBase64 = await isValidBase64(privkeyDecrypted);

  if (isBase64) {
    privkeyDecrypted = Buffer.from(privkeyDecrypted, 'base64').toString();
    newPrivKey = AesUtil.encrypt(privkeyDecrypted, password);
    update = true;
  }
  return { update, newPrivKey, privkeyDecrypted };
}