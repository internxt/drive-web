import Settings from './settings';

const openpgp = require('openpgp');

export async function decryptPGP(message: string) {
  // User settings
  const privateKey = Buffer.from(Settings.getUser().privateKey, 'base64').toString();
  const publicKey = Buffer.from(Settings.getUser().publicKey, 'base64').toString();

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
  const publicKey = Buffer.from(Settings.getUser().publicKey, 'base64').toString();

  // Prepare input
  const originalText = openpgp.message.fromText(message);
  const publicKeyArmored = await openpgp.key.readArmored(publicKey);

  // Encrypt message
  return openpgp.encrypt({
    message: originalText,
    publicKeys: publicKeyArmored.keys
  });
}