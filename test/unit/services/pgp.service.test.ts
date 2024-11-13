/**
 * @jest-environment jsdom
 */

import {
  XORhex,
  generateNewKeys,
  hybridEncryptMessageWithPublicKey,
  hybridDecryptMessageWithPrivateKey,
  standardEncryptMessageWithPublicKey,
  standardDecryptMessageWithPrivateKey,
} from '../../../src/app/crypto/services/pgp.service';

import { describe, expect, it } from 'vitest';

describe('Post-quantum Encryption and Decryption', () => {
  it('should generate new keys', async () => {
    const keys = await generateNewKeys();

    expect(keys).toHaveProperty('privateKeyArmored');
    expect(keys).toHaveProperty('publicKeyArmored');
    expect(keys).toHaveProperty('revocationCertificate');
  });

  it('should encrypt a message with the given public key', async () => {
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

  it('should generate keys, encrypt and decrypt a message successfully', async () => {
    const keys = await generateNewKeys();

    const originalMessage =
      'until bonus summer risk chunk oyster census ability frown win pull steel measure employ rigid improve riot remind system earn inch broken chalk clip';

    const encryptedMessage = await hybridEncryptMessageWithPublicKey({
      message: originalMessage,
      publicKeyInBase64: keys.publicKeyArmored,
      publicKyberKeyBase64: keys.publicKyberKeyBase64,
    });

    const decryptedMessage = await hybridDecryptMessageWithPrivateKey({
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
    const message =
      'fault avocado replace category pony erupt boil card endless reward spice undo pledge arrive copper refuse shrug scissors illegal cruise method calm short ocean';

    const encryptedMessage = await standardEncryptMessageWithPublicKey({
      message,
      publicKeyInBase64,
    });

    expect(encryptedMessage).toBeDefined();
  });

  it('should generate keys, encrypt and decrypt a message successfully', async () => {
    const keys = await generateNewKeys();
    const originalMessage =
      'market fever medal divorce arrest affair obscure trick nest village quote spend invest olive actual rookie bright odor fever orbit seek light local example';

    const encryptedMessage = await standardEncryptMessageWithPublicKey({
      message: originalMessage,
      publicKeyInBase64: keys.publicKeyArmored,
    });

    const decryptedMessage = await standardDecryptMessageWithPrivateKey({
      encryptedMessage,
      privateKeyInBase64: keys.privateKeyArmored,
    });

    expect(keys).toHaveProperty('privateKeyArmored');
    expect(keys).toHaveProperty('publicKeyArmored');
    expect(encryptedMessage).not.toEqual(originalMessage);
    expect(decryptedMessage).toEqual(originalMessage);
  });
});
