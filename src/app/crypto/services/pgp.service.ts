import kemBuilder from '@dashlane/pqc-kem-kyber512-browser';
import { WebStream, MaybeStream, Data } from 'openpgp';

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
    publicKyberKeyBase64: Buffer.from(privateKyberKey).toString('base64'),
    privateKyberKeyBase64: Buffer.from(publicKyberKey).toString('base64'),
  };
}
function XOR_hex(a, b) {
  let res = '',
    i = a.length,
    j = b.length;
  while (i-- > 0 && j-- > 0) res = (parseInt(a.charAt(i), 16) ^ parseInt(b.charAt(j), 16)).toString(16) + res;
  return res;
}

export const encryptMessageWithPublicKey = async ({
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
  const { ciphertext, sharedSecret: secret } = await kem.encapsulate(publicKyberKey);
  const kyberCiphertextStr = Buffer.from(ciphertext).toString('base64');
  const secretStr = Buffer.from(secret).toString('base64');

  // message should be the same length as secret, which is 256 bits
  const xoredMessage = XOR_hex(message, secretStr);

  const encryptedMessage = await openpgp.encrypt({
    message: await openpgp.createMessage({ text: xoredMessage }),
    encryptionKeys: publicKey,
  });

  const eccCiphertextStr = btoa(encryptedMessage as string);

  const combinedCiphertext = eccCiphertextStr.concat('$', kyberCiphertextStr);

  return combinedCiphertext;
};

export const decryptMessageWithPrivateKey = async ({
  encryptedMessage,
  privateKeyInBase64,
  privateKyberKeyBase64,
}: {
  encryptedMessage: string;
  privateKeyInBase64: string;
  privateKyberKeyBase64: string;
}): Promise<MaybeStream<Data> & WebStream<Uint8Array>> => {
  const openpgp = await getOpenpgp();
  const kem = await kemBuilder();

  const privateKeyArmored = Buffer.from(privateKeyInBase64, 'base64').toString();
  const privateKey = await openpgp.readPrivateKey({ armoredKey: privateKeyArmored });

  const ciphertexts = encryptedMessage.split('$');
  const eccCiphertextStr = ciphertexts[0];
  const kyberCiphertextBase64 = ciphertexts[1];

  const privateKyberKey = Buffer.from(privateKyberKeyBase64, 'base64');
  const kyberCiphertext = Buffer.from(kyberCiphertextBase64, 'base64');
  const { sharedSecret: secret } = await kem.decapsulate(kyberCiphertext, privateKyberKey);
  const secretStr = Buffer.from(secret).toString('base64');

  const message = await openpgp.readMessage({
    armoredMessage: eccCiphertextStr,
  });

  const { data: decryptedMessage } = await openpgp.decrypt({
    message,
    decryptionKeys: privateKey,
  });
  const decryptedMessageStr = btoa(decryptedMessage as string);

  const result = XOR_hex(decryptedMessageStr, secretStr);

  return result;
};
