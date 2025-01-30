/**
 * @jest-environment jsdom
 */
import { Buffer } from 'buffer';
import { describe, expect, it } from 'vitest';
import {
  decryptMessageWithPrivateKey,
  encryptMessageWithPublicKey,
  generateNewKeys,
  XORhex,
  hybridEncryptMessageWithPublicKey,
  hybridDecryptMessageWithPrivateKey,
} from '../../../src/app/crypto/services/pgp.service';

describe('Encryption and Decryption', () => {
  it('should generate new keys', async () => {
    const keys = await generateNewKeys();

    expect(keys).toHaveProperty('privateKeyArmored');
    expect(keys).toHaveProperty('publicKeyArmored');
    expect(keys).toHaveProperty('revocationCertificate');
    expect(keys).toHaveProperty('publicKyberKeyBase64');
    expect(keys).toHaveProperty('privateKyberKeyBase64');
  });

  it('should encrypt a message using hybrid encryption', async () => {
    const keys = await generateNewKeys();
    const publicKeyInBase64 = keys.publicKeyArmored;
    const message =
      'truck arch rather sell tilt return warm nurse rack vacuum rubber tribe unfold scissors copper sock panel ozone harsh ahead danger soda legal state';
    const publicKyberKeyBase64 = keys.publicKyberKeyBase64;

    const encryptedMessage = await hybridEncryptMessageWithPublicKey({
      message,
      publicKeyInBase64,
      publicKyberKeyBase64,
    });

    expect(encryptedMessage).toBeDefined();
  });

  it('XOR should throw an error when strings are of different length', async () => {
    const messageHex = '74686973206973207468652074657374206d657373616765';
    const secretHex =
      '74686973206973207468652074657374206d65737361676574686973206973207468652074657374206d657373616765';

    expect(() => {
      XORhex(messageHex, secretHex);
    }).toThrowError('Can XOR only strings with identical length');
  });

  it('XOR should work for the given fixed example', async () => {
    const firstHex = '74686973206973207468652074657374206d657373616765';
    const secondHex = '7468697320697320746865207365636f6e64206d65737361';
    const resultHex = '0000000000000000000000000700101b4e09451e16121404';

    const xoredMessage = await XORhex(firstHex, secondHex);

    expect(xoredMessage).toEqual(resultHex);
  });

  it('XOR of two identical strings should result in zero string', async () => {
    const strHex = '74686973206973207468652074657374206d657373616765';
    const resultHex = '000000000000000000000000000000000000000000000000';

    const xoredMessage = await XORhex(strHex, strHex);

    expect(xoredMessage).toEqual(resultHex);
  });

  it('XOR of str1, str2 and str1 should result in str2', async () => {
    const str1 = '74686973206973207468652074657374206d657373616765';
    const str2 = '7468697320697320746865207365636f6e64206d65737361';

    const str3 = await XORhex(str1, str2);
    const should_be_str2 = await XORhex(str3, str1);

    expect(should_be_str2).toEqual(str2);
  });

  it('should generate keys, encrypt and decrypt a message using hybrid encryption', async () => {
    const keys = await generateNewKeys();

    const originalMessage =
      'until bonus summer risk chunk oyster census ability frown win pull steel measure employ rigid improve riot remind system earn inch broken chalk clip';

    const encryptedMessageInBase64 = await hybridEncryptMessageWithPublicKey({
      message: originalMessage,
      publicKeyInBase64: keys.publicKeyArmored,
      publicKyberKeyBase64: keys.publicKyberKeyBase64,
    });

    const decryptedMessage = await hybridDecryptMessageWithPrivateKey({
      encryptedMessageInBase64,
      privateKeyInBase64: Buffer.from(keys.privateKeyArmored).toString('base64'),
      privateKyberKeyInBase64: keys.privateKyberKeyBase64,
    });

    expect(keys).toHaveProperty('privateKeyArmored');
    expect(keys).toHaveProperty('publicKeyArmored');
    expect(encryptedMessageInBase64).not.toEqual(originalMessage);
    expect(decryptedMessage).toEqual(originalMessage);
  });

  it('should throw an error if hybrid ciphertext but no kyber key', async () => {
    const keys = await generateNewKeys();

    const originalMessage =
      'until bonus summer risk chunk oyster census ability frown win pull steel measure employ rigid improve riot remind system earn inch broken chalk clip';

    const encryptedMessageInBase64 = await hybridEncryptMessageWithPublicKey({
      message: originalMessage,
      publicKeyInBase64: keys.publicKeyArmored,
      publicKyberKeyBase64: keys.publicKyberKeyBase64,
    });

    await expect(
      hybridDecryptMessageWithPrivateKey({
        encryptedMessageInBase64,
        privateKeyInBase64: Buffer.from(keys.privateKeyArmored).toString('base64'),
      }),
    ).rejects.toThrowError('Attempted to decrypt hybrid ciphertex without Kyber key');
  });

  it('hybrid decryption should decrypt old ciphertexts', async () => {
    const keys = await generateNewKeys();

    const originalMessage =
      'until bonus summer risk chunk oyster census ability frown win pull steel measure employ rigid improve riot remind system earn inch broken chalk clip';

    const encryptedMessage = await encryptMessageWithPublicKey({
      message: originalMessage,
      publicKeyInBase64: keys.publicKeyArmored,
    });

    const encryptedMessageStr = btoa(encryptedMessage as string);

    const decryptedMessage = await hybridDecryptMessageWithPrivateKey({
      encryptedMessageInBase64: encryptedMessageStr,
      privateKeyInBase64: Buffer.from(keys.privateKeyArmored).toString('base64'),
    });

    expect(decryptedMessage).toEqual(originalMessage);
  });

  it('hybrid decryption should decrypt old ciphertexts without kyber keys as before', async () => {
    const keys = await generateNewKeys();

    const originalMessage =
      'until bonus summer risk chunk oyster census ability frown win pull steel measure employ rigid improve riot remind system earn inch broken chalk clip';

    const encryptedMessageInBase64 = await hybridEncryptMessageWithPublicKey({
      message: originalMessage,
      publicKeyInBase64: keys.publicKeyArmored,
    });

    const decryptedMessage = await hybridDecryptMessageWithPrivateKey({
      encryptedMessageInBase64,
      privateKeyInBase64: Buffer.from(keys.privateKeyArmored).toString('base64'),
    });

    const oldDecryptedMessage = await decryptMessageWithPrivateKey({
      encryptedMessage: atob(encryptedMessageInBase64),
      privateKeyInBase64: Buffer.from(keys.privateKeyArmored).toString('base64'),
    });

    expect(decryptedMessage).toEqual(oldDecryptedMessage);
    expect(decryptedMessage).toEqual(originalMessage);
  });

  it('hybrid decryption should decrypt old ciphertexts with kyber keys as before', async () => {
    const keys = await generateNewKeys();

    const originalMessage =
      'until bonus summer risk chunk oyster census ability frown win pull steel measure employ rigid improve riot remind system earn inch broken chalk clip';

    const encryptedMessageInBase64 = await hybridEncryptMessageWithPublicKey({
      message: originalMessage,
      publicKeyInBase64: keys.publicKeyArmored,
    });

    const decryptedMessage = await hybridDecryptMessageWithPrivateKey({
      encryptedMessageInBase64,
      privateKeyInBase64: Buffer.from(keys.privateKeyArmored).toString('base64'),
      privateKyberKeyInBase64: keys.privateKyberKeyBase64,
    });

    const oldDecryptedMessage = await decryptMessageWithPrivateKey({
      encryptedMessage: atob(encryptedMessageInBase64),
      privateKeyInBase64: Buffer.from(keys.privateKeyArmored).toString('base64'),
    });

    expect(decryptedMessage).toEqual(oldDecryptedMessage);
    expect(decryptedMessage).toEqual(originalMessage);
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
    expect(keys).toHaveProperty('privateKeyArmored');
    expect(keys).toHaveProperty('publicKeyArmored');
    expect(encryptedMessage).not.toEqual(originalMessage);
    expect(decryptedMessage).toEqual(originalMessage);
  });
});
