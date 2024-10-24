import kemBuilder from '@dashlane/pqc-kem-kyber512-browser';
import { WebStream, MaybeStream, Data } from 'openpgp';
import { Buffer } from 'buffer';
import { blake3 } from 'hash-wasm';

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
 * @param {string} a The first string
 * @param {string} b The second string
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

export const hybridEncryptMessageWithPublicKey = async ({
  message,
  publicKeyInBase64,
  publicKyberKeyBase64,
}: {
  message: string;
  publicKeyInBase64: string;
  publicKyberKeyBase64: string;
}): Promise<string> => {
  const openpgp = await getOpenpgp();
  const kem = await kemBuilder();

  const publicKeyArmored = Buffer.from(publicKeyInBase64, 'base64').toString();
  const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });

  const publicKyberKey = Buffer.from(publicKyberKeyBase64, 'base64');
  const { ciphertext, sharedSecret: secret } = await kem.encapsulate(new Uint8Array(publicKyberKey));
  const kyberCiphertextStr = Buffer.from(ciphertext).toString('base64');

  const bits = message.length * 8;
  const secretHex = await blake3(secret, bits);
  const messageHex = Buffer.from(message).toString('hex');

  const xoredMessage = XORhex(messageHex, secretHex);
  const encryptedMessage = await openpgp.encrypt({
    message: await openpgp.createMessage({ text: xoredMessage }),
    encryptionKeys: publicKey,
  });

  const eccCiphertextStr = btoa(encryptedMessage as string);

  const combinedCiphertext = eccCiphertextStr.concat('$', kyberCiphertextStr);

  return combinedCiphertext;
};

export const hybridDecryptMessageWithPrivateKey = async ({
  encryptedMessage,
  privateKeyInBase64,
  privateKyberKeyBase64,
}: {
  encryptedMessage: string;
  privateKeyInBase64: string;
  privateKyberKeyBase64: string;
}): Promise<string> => {
  const openpgp = await getOpenpgp();
  const kem = await kemBuilder();

  const ciphertexts = encryptedMessage.split('$');
  const eccCiphertextStr = ciphertexts[0];
  const kyberCiphertextBase64 = ciphertexts[1];

  const privateKyberKey = Buffer.from(privateKyberKeyBase64, 'base64');
  const kyberCiphertext = Buffer.from(kyberCiphertextBase64, 'base64');
  const { sharedSecret: secret } = await kem.decapsulate(
    new Uint8Array(kyberCiphertext),
    new Uint8Array(privateKyberKey),
  );

  const message = await openpgp.readMessage({
    armoredMessage: atob(eccCiphertextStr),
  });

  const privateKey = await openpgp.readPrivateKey({ armoredKey: privateKeyInBase64 });
  const { data: decryptedMessage } = await openpgp.decrypt({
    message,
    decryptionKeys: privateKey,
  });

  const decryptedMessageHex = decryptedMessage as string;
  const bits = decryptedMessageHex.length * 4;
  const secretHex = await blake3(secret, bits);
  const result = XORhex(decryptedMessageHex, secretHex);

  const resultStr = Buffer.from(result, 'hex').toString('utf8');

  return resultStr;
};

export const standardEncryptMessageWithPublicKey = async ({
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

export const standardDecryptMessageWithPrivateKey = async ({
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
