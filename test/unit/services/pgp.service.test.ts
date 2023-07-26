import {
  generateNewKeys,
  encryptMessageWithPublicKey,
  decryptMessageWithPrivateKey,
} from '../../../src/app/crypto/services/pgp.service';

describe('Encryption and Decryption', () => {
  it('should generate new keys', async () => {
    const keys = await generateNewKeys();

    expect(keys).toHaveProperty('privateKeyArmored');
    expect(keys).toHaveProperty('publicKeyArmored');
    expect(keys).toHaveProperty('revocationCertificate');
  });

  it('should encrypt a message with the given public key', async () => {
    const keys = await generateNewKeys();
    const publicKeyInBase64 = keys.publicKeyArmored;
    const message = 'This is a test message';

    const encryptedMessage = await encryptMessageWithPublicKey({
      message,
      publicKeyInBase64,
    });

    expect(encryptedMessage).toBeDefined();
  });

  it('should generate keys, encrypt and decrypt a message successfully', async () => {
    // Step 1: Generate new keys
    const keys = await generateNewKeys();
    expect(keys).toHaveProperty('privateKeyArmored');
    expect(keys).toHaveProperty('publicKeyArmored');

    // Step 2: Prepare the message to be encrypted
    const originalMessage = 'This is a secret message!';

    // Step 3: Encrypt the message using the public key
    const encryptedMessage = await encryptMessageWithPublicKey({
      message: originalMessage,
      publicKeyInBase64: keys.publicKeyArmored,
    });

    // Step 4: Decrypt the message using the private key
    const decryptedMessage = await decryptMessageWithPrivateKey({
      encryptedMessage,
      privateKeyInBase64: Buffer.from(keys.privateKeyArmored).toString('base64'),
    });

    // Step 5: Assert that the decrypted message matches the original message
    expect(encryptedMessage).not.toEqual(originalMessage);
    expect(decryptedMessage).toEqual(originalMessage);
  });
});
