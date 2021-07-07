import * as openpgp from 'openpgp';
import localStorageService from '../services/localStorage.service';

export async function isValidBase64(key: string): Promise<boolean> {
  const isPlain = await isValid(key);

  return !isPlain;
}

export async function isValid(key: string): Promise<boolean> {
  const keyResult = await openpgp.key.readArmored(key);

  return !keyResult.err;
}

export async function decryptPGP(message: string) {
  // User settings
  const privateKey = Buffer.from(localStorageService.getUser().privateKey, 'base64').toString();
  const publicKey = Buffer.from(localStorageService.getUser().publicKey, 'base64').toString();

  // Prepare input
  const cipherText = await openpgp.message.readArmored(message);
  const publicKeyArmored = await openpgp.key.readArmored(publicKey);
  const privateKeyArmored = await openpgp.key.readArmored(privateKey);

  // Decrypt message
  return openpgp.decrypt({
    message: cipherText,
    publicKeys: publicKeyArmored.keys,
    privateKeys: privateKeyArmored.keys
  });
}

export async function encryptPGP(message: string) {
  // User settings
  const publicKey = Buffer.from(localStorageService.getUser().publicKey, 'base64').toString();

  // Prepare input
  const originalText = openpgp.message.fromText(message);
  const publicKeyArmored = await openpgp.key.readArmored(publicKey);

  // Encrypt message
  return openpgp.encrypt({
    message: originalText,
    publicKeys: publicKeyArmored.keys
  });
}

export async function encryptPGPInvitations(message: string, key: string) {
  // User settings
  const publicKey = Buffer.from(key, 'base64').toString();

  // Prepare input
  const originalText = openpgp.message.fromText(message);
  const publicKeyArmored = await openpgp.key.readArmored(publicKey);

  // Encrypt message
  return openpgp.encrypt({
    message: originalText,
    publicKeys: publicKeyArmored.keys
  });
}