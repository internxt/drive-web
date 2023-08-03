import { aes } from '@internxt/lib';
import { isValid } from './utilspgp';
import { getOpenpgp } from './pgp.service';

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
export async function assertPrivateKeyIsValid(
  privateKey: string,
  password: string,
): Promise<void> {
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
  return aes.decrypt(privateKey, password);
}

export async function assertValidateKeys(privateKey: string, publicKey: string): Promise<void> {
  const openpgp = await getOpenpgp();
  const publicKeyArmored = await openpgp.key.readArmored(publicKey);
  const privateKeyArmored = await openpgp.key.readArmored(privateKey);

  const plainMessage = 'validate-keys';
  const originalText = openpgp.message.fromText(plainMessage);
  const encryptedMessage = (await openpgp.encrypt({
    message: originalText,
    publicKeys: publicKeyArmored.keys,
  })).data;

  const decryptedMessage = (await openpgp.decrypt({
    message: await openpgp.message.readArmored(encryptedMessage),
    publicKeys: publicKeyArmored.keys,
    privateKeys: privateKeyArmored.keys,
  })).data;

  if (decryptedMessage !== plainMessage) {
    throw new KeysDoNotMatchError();
  }
}

export function getAesInitFromEnv(): { iv: string; salt: string } {
  const { REACT_APP_MAGIC_IV: MAGIC_IV, REACT_APP_MAGIC_SALT: MAGIC_SALT } = process.env;

  return { iv: MAGIC_IV as string, salt: MAGIC_SALT as string };
}
