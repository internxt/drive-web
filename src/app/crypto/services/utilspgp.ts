import localStorageService from '../../core/services/local-storage.service';
import { getOpenpgp } from './pgp.service';

export async function isValidBase64(key: string): Promise<boolean> {
  const isPlain = await isValid(key);

  return !isPlain;
}

export async function isValid(key: string): Promise<boolean> {
  const openpgp = await getOpenpgp();
  const keyResult = await openpgp.key.readArmored(key);

  return !keyResult.err;
}

export async function decryptPGP(message: string) {
  const user = localStorageService.getUser();

  if (!user) {
    throw Error('User not found on local storage');
  }

  const openpgp = await getOpenpgp();

  // User settings
  const privateKey = Buffer.from(user.privateKey, 'base64').toString();
  const publicKey = Buffer.from(user.publicKey, 'base64').toString();

  // Prepare input
  const cipherText = await openpgp.message.readArmored(message);
  const publicKeyArmored = await openpgp.key.readArmored(publicKey);
  const privateKeyArmored = await openpgp.key.readArmored(privateKey);

  // Decrypt message
  return openpgp.decrypt({
    message: cipherText,
    publicKeys: publicKeyArmored.keys,
    privateKeys: privateKeyArmored.keys,
  });
}

export async function encryptPGP(message: string) {
  const user = localStorageService.getUser();

  if (!user) {
    throw Error('User not found on local storage');
  }

  const openpgp = await getOpenpgp();

  // User settings
  const publicKey = Buffer.from(user.publicKey, 'base64').toString();

  // Prepare input
  const originalText = openpgp.message.fromText(message);
  const publicKeyArmored = await openpgp.key.readArmored(publicKey);

  // Encrypt message
  return openpgp.encrypt({
    message: originalText,
    publicKeys: publicKeyArmored.keys,
  });
}

export async function encryptPGPInvitations(message: string, key: string) {
  // User settings
  const publicKey = Buffer.from(key, 'base64').toString();

  const openpgp = await getOpenpgp();

  // Prepare input
  const originalText = openpgp.message.fromText(message);
  const publicKeyArmored = await openpgp.key.readArmored(publicKey);

  // Encrypt message
  return openpgp.encrypt({
    message: originalText,
    publicKeys: publicKeyArmored.keys,
  });
}
