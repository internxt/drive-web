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
  comparePrivateKeyCiphertextIDs,
  comparePublicKeyCiphertextIDs,
  compareKeyPairIDs,
} from '../../../src/app/crypto/services/pgp.service';

export async function getOpenpgp(): Promise<typeof import('openpgp')> {
  return import('openpgp');
}

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

    const keys = await generateNewKeys();
    const originalMessage = 'This is a secret message!';

    const encryptedMessage = await encryptMessageWithPublicKey({
      message: originalMessage,
      publicKeyInBase64: keys.publicKeyArmored,
    });

    const decryptedMessage = await decryptMessageWithPrivateKey({
      encryptedMessage,
      privateKeyInBase64: Buffer.from(keys.privateKeyArmored).toString('base64'),
    });

    expect(keys).toHaveProperty('privateKeyArmored');
    expect(keys).toHaveProperty('publicKeyArmored');
    expect(encryptedMessage).not.toEqual(originalMessage);
    expect(decryptedMessage).toEqual(originalMessage);
  });

  it('keys and ciphertext from openPGP should have the same key ID', async () => {
    const keys = await generateNewKeys();
    const originalMessage = 'Test message!';

    const encryptedMessage = await encryptMessageWithPublicKey({
      message: originalMessage,
      publicKeyInBase64: keys.publicKeyArmored,
    });

    const openpgp = await getOpenpgp();

    const privateKey = await openpgp.readPrivateKey({ armoredKey: keys.privateKeyArmored });
    const message = await openpgp.readMessage({
      armoredMessage: encryptedMessage,
    });
    const privateKeyArmored = Buffer.from(keys.publicKeyArmored, 'base64').toString();
    const publicKey = await openpgp.readKey({ armoredKey: privateKeyArmored });

    expect(comparePrivateKeyCiphertextIDs(privateKey, message)).toBeTruthy();
    expect(comparePublicKeyCiphertextIDs(publicKey, message)).toBeTruthy();
    expect(compareKeyPairIDs(privateKey, publicKey)).toBeTruthy();
  });

  it('should fail if key and ciphertext do not match', async () => {
    const keys = await generateNewKeys();
    const originalMessage = 'Test message!';

    const encryptedMessage = await encryptMessageWithPublicKey({
      message: originalMessage,
      publicKeyInBase64: keys.publicKeyArmored,
    });


    const keys_different = await generateNewKeys();

    await expect(
    decryptMessageWithPrivateKey({
      encryptedMessage,
      privateKeyInBase64: Buffer.from(keys_different.privateKeyArmored).toString('base64'),
    })
  ).rejects.toThrow('The key does not correspond to the ciphertext');

  });

  it('should decrypt a pre-defined message', async () => {
    const privateKeyInBase64 =
      'LS0tLS1CRUdJTiBQR1AgUFJJVkFURSBLRVkgQkxPQ0stLS0tLQoKeFZnRVoyTGRKQllKS3dZQkJBSGFSdzhCQVFkQUlSN1JIV1NzdDh5S2JRZkZSZFNJaDVSZ0lTZWVhTDE5ClpNcDdteWlzSUFVQUFQOTZ0bXQ4VUc3M2JvQ0hvYjJ1dkcySDVLTkNuZ0JmZy8renJTYUlrd0cySGhHNgp6UTg4YVc1NGRFQnBibmgwTG1OdmJUN0NqQVFRRmdvQVBnV0NaMkxkSkFRTENRY0lDWkFVZjJISUYwMG0KeWdNVkNBb0VGZ0FDQVFJWkFRS2JBd0llQVJZaEJDSUo4aXZPZm1zeTh1em5sUlIvWWNnWFRTYktBQUFoCnlnRUFrNjV3U2tCWEhFWm4rMXdIV1VhWFNra1U5WnNBZXJjTXFIZVZUVmZibDhBQS8zRGRxL1M3Nmljdgoxd3JqSVNwQVFCZE55a0JoSkszWEdha0ZvaHQzT2ZNT3gxMEVaMkxkSkJJS0t3WUJCQUdYVlFFRkFRRUgKUUFGR3VFek1ka2o1ZjNjUnlFMFhacXdCYU1XZU1pN2J4SEV3MjVkR1AwWUJBd0VJQndBQS8yZjZ5VFd6CnlOc05qbU9vVkJ6VEVid1lDUDZCM0xiWG9FbzhocHdqWkJrSUVHTENlQVFZRmdnQUtnV0NaMkxkSkFtUQpGSDloeUJkTkpzb0Ntd3dXSVFRaUNmSXJ6bjVyTXZMczU1VVVmMkhJRjAwbXlnQUFDb2tBL2pZS0dMZnAKa1NMakx1cmZFbDQ2VHhyNVlyTXRLV1VVSTdQYWN2WG10RDEyQVA5TFVPQlJRSWJmZXo5TWFBanp1dlNKCjBuTE9ZcExXQnZtaVFDWFcvU2x0QlE9PQo9V0orTwotLS0tLUVORCBQR1AgUFJJVkFURSBLRVkgQkxPQ0stLS0tLQo=';
    const encryptedMessageInBase64 =
      'LS0tLS1CRUdJTiBQR1AgTUVTU0FHRS0tLS0tCgp3VjREYmRBbHRVRmNHaGtTQVFkQTNDQkMwYlBPTUR4ZkFHNFhlODVsc0UvWDZPODJMQ2xkL0d2NC9LL1AKWENndzFMdDUvVllKcDhNcUxlSWMyNnV1dkg5ajcxd0Z0NEdtc21meXFlYXNPcllNcS9pam90VjVsY0F3ClVORHhxeHAyMHNBTEFmdG5OSkMzeVpyMml6aHgwYzYwWWovVmtZMGJJTEd4MXlSbHU0Nzd2QStJb29CSAowVTBSSkVhSjRoUktWd0o3ZEVjUzNoVmZxN3NxM2xEVTVXc0JDdkJUR2pITWJENTRkamRxMFVVbzRhcDUKYmpIdklReGRHM2xlT1o5WjZLbys0NmIrbjBxSE94U0Jka1hHNWhzK0E0M09DNzhlakQzSGZ0MncwM29wCnhHUlgxRGYxZ1lzb2R2RE5NN0pwMWkyNUlhT29yT1BwMVByVm5lL1FCYXp3OUdqZjhWRXd3WnZycjlsdgo2T0lpbElKUmVNQ0R4V1BSeVprTnVuU2xJTENGUk9QRDlyc0lVR0VvazdFPQo9M2RrZQotLS0tLUVORCBQR1AgTUVTU0FHRS0tLS0tCg==';
    const testMnemonic =
      'december fame egg planet busy measure beef curtain ankle brisk romance snap rookie window soft verb lawsuit juice crane envelope stereo theory glass rural';

    const decryptedMnemonic = await decryptMessageWithPrivateKey({
      encryptedMessage: atob(encryptedMessageInBase64),
      privateKeyInBase64,
    });

    expect(decryptedMnemonic).toEqual(testMnemonic);
  });
});
