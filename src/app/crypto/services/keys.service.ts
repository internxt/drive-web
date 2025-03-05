import { aes } from '@internxt/lib';
import { Keys } from '@internxt/sdk';
import { getOpenpgp, generateNewKeys } from './pgp.service';
import { isValid } from './utilspgp';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
const MINIMAL_ENCRYPTED_KEY_LEN = 129;

export async function getKeys(password: string): Promise<Keys> {
  const { privateKeyArmored, publicKeyArmored, revocationCertificate, publicKyberKeyBase64, privateKyberKeyBase64 } =
    await generateNewKeys();
  const encPrivateKey = aes.encrypt(privateKeyArmored, password, getAesInitFromEnv());
  const encPrivateKyberKey = aes.encrypt(privateKyberKeyBase64, password, getAesInitFromEnv());

  const keys: Keys = {
    privateKeyEncrypted: encPrivateKey,
    publicKey: publicKeyArmored,
    revocationCertificate: revocationCertificate,
    ecc: {
      privateKeyEncrypted: encPrivateKey,
      publicKey: publicKeyArmored,
    },
    kyber: {
      publicKey: publicKyberKeyBase64,
      privateKeyEncrypted: encPrivateKyberKey,
    },
  };
  return keys;
}

export class Base64EncodedPrivateKeyError extends Error {
  constructor() {
    super('Key is encoded in base64');

    Object.setPrototypeOf(this, Base64EncodedPrivateKeyError.prototype);
  }
}

export class WrongIterationsToEncryptPrivateKeyError extends Error {
  constructor() {
    super('Key was encrypted using the wrong iterations number');

    Object.setPrototypeOf(this, WrongIterationsToEncryptPrivateKeyError.prototype);
  }
}

export class CorruptedEncryptedPrivateKeyError extends Error {
  constructor() {
    super('Key is corrupted');

    Object.setPrototypeOf(this, CorruptedEncryptedPrivateKeyError.prototype);
  }
}

export class KeysDoNotMatchError extends Error {
  constructor() {
    super('Keys do not match');

    Object.setPrototypeOf(this, CorruptedEncryptedPrivateKeyError.prototype);
  }
}

/**
 * This function validates the private key
 * @param privateKey The private key to validate encrypted
 * @param password The password used for encrypting the private key
 * @throws {Base64EncodedPrivateKeyError} If the PLAIN private key is base64 encoded (known issue introduced in the past)
 * @throws {WrongIterationsToEncryptPrivateKeyError} If the ENCRYPTED private key was encrypted using the wrong iterations number (known issue introduced in the past)
 * @throws {CorruptedEncryptedPrivateKeyError} If the ENCRYPTED private key is un-decryptable (corrupted)
 * @async
 */
export async function assertPrivateKeyIsValid(privateKey: string, password: string): Promise<void> {
  let privateKeyDecrypted: string;

  try {
    privateKeyDecrypted = decryptPrivateKey(privateKey, password);
  } catch {
    try {
      aes.decrypt(privateKey, password, 9999);
    } catch {
      throw new CorruptedEncryptedPrivateKeyError();
    }

    throw new WrongIterationsToEncryptPrivateKeyError();
  }

  const hasValidFormat = await isValid(privateKeyDecrypted);

  if (!hasValidFormat) throw new Base64EncodedPrivateKeyError();
}

export function decryptPrivateKey(privateKey: string, password: string): string {
  if (!privateKey || privateKey.length <= MINIMAL_ENCRYPTED_KEY_LEN) return '';
  else {
    try {
      const result = aes.decrypt(privateKey, password);
      return result;
    } catch (error) {
      throw new CorruptedEncryptedPrivateKeyError();
    }
  }
}

export function parseAndDecryptUserKeys(
  user: UserSettings,
  password: string,
): { publicKey: string; privateKey: string; publicKyberKey: string; privateKyberKey: string } {
  const decryptedPrivateKey = decryptPrivateKey(user.privateKey, password);
  const privateKey = user.privateKey ? Buffer.from(decryptedPrivateKey).toString('base64') : '';

  let privateKyberKey = '';
  if (user.keys?.kyber?.privateKey) {
    privateKyberKey = decryptPrivateKey(user.keys.kyber.privateKey, password);
  }

  const publicKey = user.keys?.ecc?.publicKey ?? user.publicKey;
  const publicKyberKey = user.keys?.kyber?.publicKey ?? '';

  return { publicKey, privateKey, publicKyberKey, privateKyberKey };
}

export async function assertValidateKeys(privateKey: string, publicKey: string): Promise<void> {
  const openpgp = await getOpenpgp();
  const publicKeyArmored = await openpgp.readKey({ armoredKey: publicKey });
  const privateKeyArmored = await openpgp.readPrivateKey({ armoredKey: privateKey });

  const plainMessage = 'validate-keys';
  const originalText = await openpgp.createMessage({ text: plainMessage });
  const encryptedMessage = await openpgp.encrypt({
    message: originalText,
    encryptionKeys: publicKeyArmored,
  });

  const decryptedMessage = (
    await openpgp.decrypt({
      message: await openpgp.readMessage({ armoredMessage: encryptedMessage }),
      verificationKeys: publicKeyArmored,
      decryptionKeys: privateKeyArmored,
    })
  ).data;

  if (decryptedMessage !== plainMessage) {
    throw new KeysDoNotMatchError();
  }
}

export function getAesInitFromEnv(): { iv: string; salt: string } {
  const { REACT_APP_MAGIC_IV: MAGIC_IV, REACT_APP_MAGIC_SALT: MAGIC_SALT } = process.env;

  return { iv: MAGIC_IV as string, salt: MAGIC_SALT as string };
}
