import { DecryptMessageResult, WebStream } from 'openpgp';
import localStorageService from '../../core/services/local-storage.service';
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

export async function decryptPGP(armoredMessage: string): Promise<DecryptMessageResult> {
  const user = localStorageService.getUser();
  const openpgp = await getOpenpgp();

  if (!user) {
    throw Error('User not found on local storage');
  }

  // User settings
  const privateKey = Buffer.from(user.privateKey, 'base64').toString();
  const publicKey = Buffer.from(user.publicKey, 'base64').toString();

  // Prepare input
  const cipherText = await openpgp.readMessage({ armoredMessage });
  const publicKeyArmored = await openpgp.readKey({ armoredKey: publicKey });
  const privateKeyArmored = await openpgp.readPrivateKey({ armoredKey: privateKey });

  // Decrypt message
  return openpgp.decrypt({
    message: cipherText,
    verificationKeys: publicKeyArmored,
    decryptionKeys: privateKeyArmored,
  });
}

export async function encryptPGP(message: string): Promise<WebStream<string>> {
  const user = localStorageService.getUser();
  const openpgp = await getOpenpgp();

  if (!user) {
    throw Error('User not found on local storage');
  }

  // User settings
  const publicKey = Buffer.from(user.publicKey, 'base64').toString();

  // Prepare input
  const originalText = await openpgp.createMessage({ text: message });
  const publicKeyArmored = await openpgp.readKey({ armoredKey: publicKey });

  // Encrypt message
  return openpgp.encrypt({
    message: originalText,
    encryptionKeys: publicKeyArmored,
  });
}

export async function encryptPGPInvitations(message: string, key: string): Promise<WebStream<string>> {
  const openpgp = await getOpenpgp();

  // User settings
  const publicKey = Buffer.from(key, 'base64').toString();

  // Prepare input
  const originalText = await openpgp.createMessage({ text: message });
  const publicKeyArmored = await openpgp.readKey({ armoredKey: publicKey });

  // Encrypt message
  return openpgp.encrypt({
    message: originalText,
    encryptionKeys: publicKeyArmored,
  });
}
