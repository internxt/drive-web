import { getOpenpgp } from './pgp.service';

export async function isValidBase64(key: string): Promise<boolean> {
  const isPlain = await isValid(key);

  return !isPlain;
}

export async function isValid(key: string): Promise<boolean> {
  try {
    const openpgp = await getOpenpgp();
    await openpgp.readKey({ armoredKey: key });
    return true;
  } catch (error) {
    return false;
  }
}
