import {
  XORhex,
  generateNewKeys,
  encryptMessageWithPublicKey,
  decryptMessageWithPrivateKey,
} from '../../../src/app/crypto/services/pgp.service';

import { Buffer } from 'buffer';
import { describe, expect, it } from 'vitest';

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
    const publicKyberKeyBase64 = keys.publicKyberKeyBase64;

    const encryptedMessage = await encryptMessageWithPublicKey({
      message,
      publicKeyInBase64,
      publicKyberKeyBase64,
    });

    expect(encryptedMessage).toBeDefined();
  });

  it('xor should work', async () => {
    const messageHex = Buffer.from('This is a test message').toString('hex');
    const secretHex = Buffer.from('This is a test secret!').toString('hex');

    expect(messageHex.length).toEqual(secretHex.length);

    const xoredMessage = await XORhex(messageHex, secretHex);
    const xoredMessageReveredOrder = await XORhex(secretHex, messageHex);

    const recoveredMessage = await XORhex(xoredMessage, secretHex);
    const recoveredSecret = await XORhex(xoredMessage, messageHex);

    expect(xoredMessage).not.toEqual(messageHex);
    expect(xoredMessage).toEqual(xoredMessageReveredOrder);
    expect(recoveredMessage).toEqual(messageHex);
    expect(recoveredSecret).toEqual(secretHex);
  });

  it('should generate keys, encrypt and decrypt a message successfully', async () => {
    // Step 1: Generate new keys
    const keys = await generateNewKeys();

    // Step 2: Prepare the message to be encrypted
    const originalMessage = 'A secret key of exactly 256 bits';
    expect(Buffer.from(originalMessage).toString('hex').length).toEqual(64);

    // Step 3: Encrypt the message using the public key
    const encryptedMessage = await encryptMessageWithPublicKey({
      message: originalMessage,
      publicKeyInBase64: keys.publicKeyArmored,
      publicKyberKeyBase64: keys.publicKyberKeyBase64,
    });

    // Step 4: Decrypt the message using the private key
    const decryptedMessage = await decryptMessageWithPrivateKey({
      encryptedMessage,
      privateKeyInBase64: keys.privateKeyArmored,
      privateKyberKeyBase64: keys.privateKyberKeyBase64,
    });

    // Step 5: Assert that the decrypted message matches the original message
    expect(keys).toHaveProperty('privateKeyArmored');
    expect(keys).toHaveProperty('publicKeyArmored');
    expect(encryptedMessage).not.toEqual(originalMessage);
    expect(decryptedMessage).toEqual(originalMessage);
  });
});
