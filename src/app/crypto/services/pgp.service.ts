import { Buffer } from 'buffer';
import { Data, MaybeStream, WebStream } from 'openpgp';
import kemBuilder from '@dashlane/pqc-kem-kyber512-browser';
import { extendSecret } from './utils';

const WORDS_HYBRID_MODE_IN_BASE64 = 'SHlicmlkTW9kZQ=='; // 'HybridMode' in BASE64 format

export async function getOpenpgp(): Promise<typeof import('openpgp')> {
  return import('openpgp');
}
export async function generateNewKeys(): Promise<{
  privateKeyArmored: string;
  publicKeyArmored: string;
  revocationCertificate: string;
  publicKyberKeyBase64: string;
  privateKyberKeyBase64: string;
}> {
  const openpgp = await getOpenpgp();

  const { privateKey, publicKey, revocationCertificate } = await openpgp.generateKey({
    userIDs: [{ email: 'inxt@inxt.com' }],
    curve: 'ed25519',
  });

  const kem = await kemBuilder();
  const { publicKey: publicKyberKey, privateKey: privateKyberKey } = await kem.keypair();

  return {
    privateKeyArmored: privateKey,
    publicKeyArmored: Buffer.from(publicKey).toString('base64'),
    revocationCertificate: Buffer.from(revocationCertificate).toString('base64'),
    publicKyberKeyBase64: Buffer.from(publicKyberKey).toString('base64'),
    privateKyberKeyBase64: Buffer.from(privateKyberKey).toString('base64'),
  };
}

/**
 * XORs two strings of the identical length
 * @param {string} a - The first string
 * @param {string} b - The second string
 * @returns {string} The result of XOR of strings a and b.
 */
export function XORhex(a: string, b: string): string {
  let res = '',
    i = a.length,
    j = b.length;
  if (i != j) {
    throw new Error('Can XOR only strings with identical length');
  }
  while (i-- > 0 && j-- > 0) res = (parseInt(a.charAt(i), 16) ^ parseInt(b.charAt(j), 16)).toString(16) + res;
  return res;
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
    const kem = await kemBuilder();

    const publicKyberKey = Buffer.from(publicKyberKeyBase64, 'base64');
    const { ciphertext, sharedSecret: secret } = await kem.encapsulate(new Uint8Array(publicKyberKey));
    const kyberCiphertextStr = Buffer.from(ciphertext).toString('base64');

    const bits = message.length * 8;
    const secretHex = await extendSecret(secret, bits);
    const messageHex = Buffer.from(message).toString('hex');

    plaintext = XORhex(messageHex, secretHex);
    result = WORDS_HYBRID_MODE_IN_BASE64.concat('$', kyberCiphertextStr, '$');
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
  let eccCiphertextStr = encryptedMessageInBase64;
  let kyberSecret;
  const ciphertexts = encryptedMessageInBase64.split('$');
  const prefix = ciphertexts[0];
  const isHybridMode = prefix === WORDS_HYBRID_MODE_IN_BASE64;

  if (isHybridMode) {
    if (!privateKyberKeyInBase64) {
      return Promise.reject(new Error('Attempted to decrypt hybrid ciphertex without Kyber key'));
    }
    const kem = await kemBuilder();

    const kyberCiphertextBase64 = ciphertexts[1];
    eccCiphertextStr = ciphertexts[2];

    const privateKyberKey = Buffer.from(privateKyberKeyInBase64, 'base64');
    const kyberCiphertext = Buffer.from(kyberCiphertextBase64, 'base64');
    const decapsulate = await kem.decapsulate(new Uint8Array(kyberCiphertext), new Uint8Array(privateKyberKey));
    kyberSecret = decapsulate.sharedSecret;
  }
  const decryptedMessage = await decryptMessageWithPrivateKey({
    encryptedMessage: atob(eccCiphertextStr),
    privateKeyInBase64,
  });
  let result = decryptedMessage as string;
  if (isHybridMode) {
    const bits = result.length * 4;
    const secretHex = await extendSecret(kyberSecret, bits);
    const xored = XORhex(result, secretHex);
    result = Buffer.from(xored, 'hex').toString('utf8');
  }

  return result;
};

export const encryptMessageWithPublicKey = async ({
  message,
  publicKeyInBase64,
}: {
  message: string;
  publicKeyInBase64: string;
}): Promise<WebStream<string>> => {
  const openpgp = await getOpenpgp();

  const publicKeyArmored = Buffer.from(publicKeyInBase64, 'base64').toString();
  const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });

  const encryptedMessage = await openpgp.encrypt({
    message: await openpgp.createMessage({ text: message }),
    encryptionKeys: publicKey,
  });

  return encryptedMessage;
};

export const decryptMessageWithPrivateKey = async ({
  encryptedMessage,
  privateKeyInBase64,
}: {
  encryptedMessage: WebStream<string>;
  privateKeyInBase64: string;
}): Promise<MaybeStream<Data> & WebStream<Uint8Array>> => {
  const openpgp = await getOpenpgp();

  const privateKeyArmored = Buffer.from(privateKeyInBase64, 'base64').toString();
  const privateKey = await openpgp.readPrivateKey({ armoredKey: privateKeyArmored });

  const message = await openpgp.readMessage({
    armoredMessage: encryptedMessage,
  });

  const { data: decryptedMessage } = await openpgp.decrypt({
    message,
    decryptionKeys: privateKey,
  });

  return decryptedMessage;
};
