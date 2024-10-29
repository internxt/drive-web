/**
 * @jest-environment node
 */

import {
  XORhex,
  generateNewKeys,
  encryptMessageWithPublicKey,
  decryptMessageWithPrivateKey,
} from '../../../src/app/crypto/services/pgp.service';

import { Buffer } from 'buffer';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@dashlane/pqc-kem-kyber512-browser', () => ({
  default: vi.fn().mockResolvedValue({
    keypair: vi.fn().mockResolvedValue({
      publicKey: new Uint8Array(32),
      privateKey: new Uint8Array(32),
    }),
    encapsulate: vi.fn().mockResolvedValue({
      ciphertext: new Uint8Array(32),
      sharedSecret: new Uint8Array(32),
    }),
    decapsulate: vi.fn().mockResolvedValue({
      sharedSecret: new Uint8Array(32),
    }),
  }),
}));

describe('Encryption and Decryption', () => {
  it('should generate new keys', async () => {
    const keys = await generateNewKeys();

    expect(keys).toHaveProperty('privateKeyArmored');
    expect(keys).toHaveProperty('publicKeyArmored');
    expect(keys).toHaveProperty('revocationCertificate');
    expect(keys).toHaveProperty('publicKyberKeyBase64');
    expect(keys).toHaveProperty('privateKyberKeyBase64');
  });

  it('rejects if the message is not 256 bits', async () => {
    const keys = await generateNewKeys();
    const publicKeyInBase64 = keys.publicKeyArmored;
    const message = 'A short message';
    const publicKyberKeyBase64 = keys.publicKyberKeyBase64;

    await expect(
      encryptMessageWithPublicKey({
        message,
        publicKeyInBase64,
        publicKyberKeyBase64,
      }),
    ).rejects.toThrow('The message should be 256 bits');
  });

  it('should encrypt a message with the given public key', async () => {
    const keys = await generateNewKeys();
    const publicKeyInBase64 = keys.publicKeyArmored;
    const message = 'A secret key of exactly 256 bits';
    const publicKyberKeyBase64 = keys.publicKyberKeyBase64;

    const encryptedMessage = await encryptMessageWithPublicKey({
      message,
      publicKeyInBase64,
      publicKyberKeyBase64,
    });

    expect(encryptedMessage).toBeDefined();
  });

  it('XOR should throw an error when strings are of different length', async () => {
    const messageHex = Buffer.from('This is a test message').toString('hex');
    const secretHex = Buffer.from('This is a test with a much longer secret!').toString('hex');

    expect(messageHex.length).not.toEqual(secretHex.length);

    expect(() => {
      XORhex(messageHex, secretHex);
    }).toThrowError('Can XOR only strings with identical length');
  });

  it('XOR should work for the given fixed example', async () => {
    const firstHex = '74686973206973207468652074657374206d657373616765';
    const secondHex = '7468697320697320746865207365636f6e64206d65737361';
    const resultHex = '0000000000000000000000000700101b4e09451e16121404';

    const xoredMessage = XORhex(firstHex, secondHex);

    expect(xoredMessage).toEqual(resultHex);
  });

  it('XOR of two identical strings should result in zero string', async () => {
    const strHex = '74686973206973207468652074657374206d657373616765';
    const resultHex = '000000000000000000000000000000000000000000000000';

    const xoredMessage = XORhex(strHex, strHex);

    expect(xoredMessage).toEqual(resultHex);
  });

  it('XOR of str1, str2 and str1 should result in str2', async () => {
    const str1 = '74686973206973207468652074657374206d657373616765';
    const str2 = '7468697320697320746865207365636f6e64206d65737361';

    const str3 = XORhex(str1, str2);
    const shouldBeStr2 = XORhex(str3, str1);

    expect(shouldBeStr2).toEqual(str2);
  });

  it('should generate keys, encrypt, and decrypt a message successfully', async () => {
    const keys = await generateNewKeys();

    const originalMessage = 'A secret key of exactly 256 bits';
    expect(Buffer.from(originalMessage).length).toBe(32);

    const encryptedMessage = await encryptMessageWithPublicKey({
      message: originalMessage,
      publicKeyInBase64: keys.publicKeyArmored,
      publicKyberKeyBase64: keys.publicKyberKeyBase64,
    });

    const decryptedMessage = await decryptMessageWithPrivateKey({
      encryptedMessage,
      privateKeyInBase64: keys.privateKeyArmored,
      privateKyberKeyBase64: keys.privateKyberKeyBase64,
    });

    expect(keys).toHaveProperty('privateKeyArmored');
    expect(keys).toHaveProperty('publicKeyArmored');
    expect(encryptedMessage).not.toEqual(originalMessage);
    expect(decryptedMessage).toEqual(originalMessage);
  });
});
