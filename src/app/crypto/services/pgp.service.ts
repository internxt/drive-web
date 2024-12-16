import { Buffer } from 'buffer';
import { Data, MaybeStream, WebStream } from 'openpgp';
import kemBuilder from '@dashlane/pqc-kem-kyber512-browser';

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
