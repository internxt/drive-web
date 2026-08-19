import { Buffer } from 'buffer';
import { MaybeStream, Message, PrivateKey, PublicKey, WebStream } from 'openpgp';

import kemBuilder from '@dashlane/pqc-kem-kyber512-browser';
import { extendSecret } from './utils';

const WORDS_HYBRID_MODE_IN_BASE64 = 'SHlicmlkTW9kZQ=='; // 'HybridMode' in BASE64 format
const WORDS_HYBRID_BUCKET_KEY_IN_BASE64 = 'SHlicmlkQnVja2V0S2V5'; // 'HybridBucketKey' in BASE64 format
type Data = Uint8Array | string;

export async function getOpenpgp(): Promise<typeof import('openpgp')> {
  return import('openpgp');
}

export function comparePrivateKeyCiphertextIDs(privateKey: PrivateKey, encryptedMessage: Message<string>): boolean {
  const [messageKeyId] = encryptedMessage.getEncryptionKeyIDs();
  const [privateSubkey] = privateKey.getSubkeys();

  if (!messageKeyId || !privateSubkey) {
    throw new Error('Cannot compare key IDs: message or private key has no key IDs');
  }

  return messageKeyId.toHex() === privateSubkey.getKeyID().toHex();
}

export function compareKeyPairIDs(privateKey: PrivateKey, publicKey: PublicKey): boolean {
  const [publicSubkey] = publicKey.getSubkeys();
  const [privateSubkey] = privateKey.getSubkeys();

  if (!publicSubkey || !privateSubkey) {
    throw new Error('Cannot compare key IDs: public or private key has no subkeys');
  }

  return publicSubkey.getKeyID().toHex() === privateSubkey.getKeyID().toHex();
}

async function kyberEncapsulate(
  publicKyberKeyBase64: string,
): Promise<{ ciphertextBase64: string; secret: Uint8Array }> {
  const kem = await kemBuilder();
  const publicKyberKey = Buffer.from(publicKyberKeyBase64, 'base64');
  const { ciphertext, sharedSecret } = await kem.encapsulate(new Uint8Array(publicKyberKey));
  return { ciphertextBase64: Buffer.from(ciphertext).toString('base64'), secret: sharedSecret };
}

async function kyberDecapsulate(
  kyberCiphertextBase64: string,
  privateKyberKeyBase64: string | undefined,
): Promise<Uint8Array> {
  if (!privateKyberKeyBase64) throw new Error('Attempted to decrypt hybrid ciphertex without Kyber key');

  const kem = await kemBuilder();
  const privateKyberKey = Buffer.from(privateKyberKeyBase64, 'base64');
  const kyberCiphertext = Buffer.from(kyberCiphertextBase64, 'base64');
  const { sharedSecret } = await kem.decapsulate(new Uint8Array(kyberCiphertext), new Uint8Array(privateKyberKey));
  return sharedSecret;
}

interface HybridSplitResult {
  kyberCiphertextBase64?: string;
  eccCiphertextStr: string;
}

function splitHybridCiphertext(input: string, hybridPrefix: string): HybridSplitResult {
  const parts = input.split('$');
  const isHybridMode = parts[0] === hybridPrefix;

  if (!isHybridMode) {
    return { eccCiphertextStr: input };
  }
  if (parts.length !== 3) {
    throw new Error('Malformed hybrid ciphertext');
  }
  return { kyberCiphertextBase64: parts[1], eccCiphertextStr: parts[2] };
}

export async function generateNewKeys(): Promise<{
  privateKeyArmored: string;
  publicKeyArmored: string;
  publicKyberKeyBase64: string;
  privateKyberKeyBase64: string;
}> {
  const openpgp = await getOpenpgp();

  const { privateKey, publicKey } = await openpgp.generateKey({
    userIDs: [{ email: 'inxt@inxt.com' }],
    curve: 'ed25519Legacy',
  });

  const kem = await kemBuilder();
  const { publicKey: publicKyberKey, privateKey: privateKyberKey } = await kem.keypair();

  return {
    privateKeyArmored: privateKey,
    publicKeyArmored: Buffer.from(publicKey).toString('base64'),
    publicKyberKeyBase64: Buffer.from(publicKyberKey).toString('base64'),
    privateKyberKeyBase64: Buffer.from(privateKyberKey).toString('base64'),
  };
}

/**
 * XORs two strings of the identical length
 * @param {string} a - The first string
 * @param {string} b - The second string
 * @returns {Uint8Array} The result of XOR of strings a and b.
 */
export function XORhex(a: string, b: string): Uint8Array {
  const aBytes = Buffer.from(a, 'hex');
  const bBytes = Buffer.from(b, 'hex');
  return xorUint8Arrays(new Uint8Array(aBytes), new Uint8Array(bBytes));
}

/**
 * Encrypts message using hybrid method (ecc and kyber) if kyber key is given, else uses ecc only
 * @param {string} message - The message to encrypt
 * @param {string} publicKeyInBase64 - The ecc public key in Base64
 * @param {string=}[publicKyberKeyBase64] - The kyber public key in Base64
 * @returns {Promise<string>} The encrypted message.
 */
export const hybridEncryptMessageWithPublicKey = async ({
  message,
  publicKeyInBase64,
  publicKyberKeyBase64,
}: {
  message: string;
  publicKeyInBase64: string;
  publicKyberKeyBase64?: string;
}): Promise<string> => {
  let result = '';
  let plaintext = message;
  if (publicKyberKeyBase64) {
    const { ciphertextBase64, secret } = await kyberEncapsulate(publicKyberKeyBase64);

    const bits = message.length * 8;
    const secretHex = await extendSecret(secret, bits);
    const messageHex = Buffer.from(message).toString('hex');

    const xored = XORhex(messageHex, secretHex);
    plaintext = Buffer.from(xored).toString('hex');
    result = WORDS_HYBRID_MODE_IN_BASE64.concat('$', ciphertextBase64, '$');
  }

  const encryptedMessage = await encryptMessageWithPublicKey({ message: plaintext, publicKeyInBase64 });
  const eccCiphertextStr = btoa(encryptedMessage as string);

  result = result.concat(eccCiphertextStr);

  return result;
};

/**
 * Decrypts ciphertext using hybrid method (ecc and kyber) if kyber key is given, else uses ecc only
 * @param {string} encryptedMessageInBase64 - The encrypted message
 * @param {string} privateKeyInBase64 - The ecc private key in Base64
 * @param {string=}[privateKyberKeyInBase64] - The kyber private key in Base64
 * @returns {Promise<string>} The encrypted message.
 */
export const hybridDecryptMessageWithPrivateKey = async ({
  encryptedMessageInBase64,
  privateKeyInBase64,
  privateKyberKeyInBase64,
}: {
  encryptedMessageInBase64: string;
  privateKeyInBase64: string;
  privateKyberKeyInBase64?: string;
}): Promise<string> => {
  const { kyberCiphertextBase64, eccCiphertextStr } = splitHybridCiphertext(
    encryptedMessageInBase64,
    WORDS_HYBRID_MODE_IN_BASE64,
  );

  const decryptedMessage = await decryptMessageWithPrivateKey({
    encryptedMessage: atob(eccCiphertextStr),
    privateKeyInBase64,
  });
  let result = decryptedMessage as string;

  if (kyberCiphertextBase64) {
    const sharedSecret = await kyberDecapsulate(kyberCiphertextBase64, privateKyberKeyInBase64);
    const bits = result.length * 4;
    const secretHex = await extendSecret(sharedSecret, bits);
    const xored = XORhex(result, secretHex);
    result = Buffer.from(xored).toString('utf8');
  }

  return result;
};

export const encryptMessageWithPublicKey = async ({
  message,
  publicKeyInBase64,
}: {
  message: string | Uint8Array;
  publicKeyInBase64: string;
}): Promise<WebStream<string>> => {
  const openpgp = await getOpenpgp();

  const publicKeyArmored = Buffer.from(publicKeyInBase64, 'base64').toString();
  const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });

  const messageToEncrypt =
    typeof message === 'string'
      ? await openpgp.createMessage({ text: message })
      : await openpgp.createMessage({ binary: message });

  const encryptedMessage = await openpgp.encrypt({
    message: messageToEncrypt,
    encryptionKeys: publicKey,
  });

  return encryptedMessage;
};

export const decryptMessageWithPrivateKey = async ({
  encryptedMessage,
  privateKeyInBase64,
  format = 'utf8',
}: {
  encryptedMessage: WebStream<string>;
  privateKeyInBase64: string;
  format?: 'utf8' | 'binary';
}): Promise<MaybeStream<Data> & WebStream<Uint8Array>> => {
  const openpgp = await getOpenpgp();

  const privateKeyArmored = Buffer.from(privateKeyInBase64, 'base64').toString();
  const privateKey = await openpgp.readPrivateKey({ armoredKey: privateKeyArmored });

  const message = await openpgp.readMessage({
    armoredMessage: encryptedMessage,
  });

  if (!comparePrivateKeyCiphertextIDs(privateKey, message)) {
    throw new Error('The key does not correspond to the ciphertext');
  }
  const { data: decryptedMessage } = await openpgp.decrypt({
    message,
    decryptionKeys: privateKey,
    format,
  });

  return decryptedMessage;
};

function xorUint8Arrays(a: Uint8Array, b: Uint8Array): Uint8Array {
  if (a.length !== b.length) {
    throw new Error('Can XOR only identical lengths');
  }
  const result = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] ^ b[i];
  }
  return result;
}

/**
 * Encrypts bucket key using hybrid method (ecc and kyber) if kyber key is given, else uses ecc only
 * @param {Uint8Array} bucketKey - The bucket key to encrypt
 * @param {string} publicKeyInBase64 - The ecc public key in Base64
 * @param {string}[publicKyberKeyBase64] - The kyber public key in Base64
 * @returns {Promise<string>} The encrypted message.
 */
export const encryptBucketKeyHybrid = async ({
  bucketKey,
  publicKeyInBase64,
  publicKyberKeyBase64,
}: {
  bucketKey: Uint8Array;
  publicKeyInBase64: string;
  publicKyberKeyBase64?: string;
}): Promise<string> => {
  let result = '';
  if (bucketKey.length < 32) {
    throw new Error('bucketKey must be at least 32 bytes');
  }
  let plaintext: Uint8Array = bucketKey.subarray(0, 32);
  if (publicKyberKeyBase64) {
    const { ciphertextBase64, secret } = await kyberEncapsulate(publicKyberKeyBase64);

    plaintext = xorUint8Arrays(plaintext, secret);
    result = WORDS_HYBRID_BUCKET_KEY_IN_BASE64.concat('$', ciphertextBase64, '$');
  }

  const encryptedMessage = await encryptMessageWithPublicKey({ message: plaintext, publicKeyInBase64 });
  const eccCiphertextStr = btoa(encryptedMessage as string);

  result = result.concat(eccCiphertextStr);

  return result;
};

/**
 * Decrypts ciphertext using hybrid method (ecc and kyber) if kyber key is given, else uses ecc only
 * @param {string} encryptedMessageInBase64 - The encrypted message
 * @param {string} privateKeyInBase64 - The ecc private key in Base64
 * @param {string}[privateKyberKeyInBase64] - The kyber private key in Base64
 * @returns {Promise<Uint8Array>} The decrypted bucket key.
 */
export const decryptBucketKeyHybrid = async ({
  encryptedMessageInBase64,
  privateKeyInBase64,
  privateKyberKeyInBase64,
}: {
  encryptedMessageInBase64: string;
  privateKeyInBase64: string;
  privateKyberKeyInBase64?: string;
}): Promise<Uint8Array> => {
  const { kyberCiphertextBase64, eccCiphertextStr } = splitHybridCiphertext(
    encryptedMessageInBase64,
    WORDS_HYBRID_BUCKET_KEY_IN_BASE64,
  );

  const decryptedMessage = await decryptMessageWithPrivateKey({
    encryptedMessage: atob(eccCiphertextStr),
    privateKeyInBase64,
    format: 'binary',
  });

  let result = decryptedMessage as Uint8Array;

  if (kyberCiphertextBase64) {
    const sharedSecret = await kyberDecapsulate(kyberCiphertextBase64, privateKyberKeyInBase64);
    const xored = xorUint8Arrays(result, sharedSecret);
    result = xored;
  }

  return result;
};

export function isBucketKeyCiphertext(encryptedMessageInBase64: string): boolean {
  return encryptedMessageInBase64.split('$')[0] === WORDS_HYBRID_BUCKET_KEY_IN_BASE64;
}
