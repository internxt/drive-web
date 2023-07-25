import * as openpgp from 'openpgp';

export async function generateNewKeys(): Promise<{
  privateKeyArmored: string;
  publicKeyArmored: string;
  revocationCertificate: string;
}> {
  const { privateKey, publicKey, revocationCertificate } = await openpgp.generateKey({
    userIDs: [{ email: 'inxt@inxt.com' }],
    curve: 'ed25519',
  });

  return {
    privateKeyArmored: privateKey,
    publicKeyArmored: Buffer.from(publicKey).toString('base64'),
    revocationCertificate: Buffer.from(revocationCertificate).toString('base64'),
  };
}

export const encryptMessageWithPublicKey = async ({
  message,
  publicKeyInBase64,
}: {
  message: string;
  publicKeyInBase64: string;
}): Promise<openpgp.WebStream<string>> => {
  const publicKeyArmored = Buffer.from(publicKeyInBase64, 'base64').toString('ascii');
  const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });

  const encryptedMessage = await openpgp.encrypt({
    message: await openpgp.createMessage({ text: message }),
    encryptionKeys: publicKey,
  });
  console.log({ encryptedMessage: encryptedMessage });

  return encryptedMessage;
};

export const decryptMessageWithPrivateKey = async ({
  encryptedMessage,
  privateKeyInBase64,
}: {
  encryptedMessage: openpgp.WebStream<string>;
  privateKeyInBase64: string;
}): Promise<openpgp.MaybeStream<openpgp.Data> & openpgp.WebStream<Uint8Array>> => {
  const privateKeyArmored = Buffer.from(privateKeyInBase64, 'base64').toString('ascii');
  const privateKey = await openpgp.readPrivateKey({ armoredKey: privateKeyArmored });

  const message = await openpgp.readMessage({
    armoredMessage: encryptedMessage,
  });

  const { data: decrypted } = await openpgp.decrypt({
    message,
    decryptionKeys: privateKey,
  });

  return decrypted;
};
