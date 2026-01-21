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
      }),
    ).rejects.toThrow('The key does not correspond to the ciphertext');
  });

  it('should decrypt a pre-defined message (without Kyber)', async () => {
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

  it('should decrypt a pre-defined message (with Kyber)', async () => {
    const privateKeyInBase64 =
      'LS0tLS1CRUdJTiBQR1AgUFJJVkFURSBLRVkgQkxPQ0stLS0tLQoKeFZnRWFHUFJqaFlKS3dZQkJBSGFSdzhCQVFkQVdTYXMxc1hzRnlsL0g0amV6QXZ0azB2enhPTlN1QU5SCk9yK0RGbnkydXU4QUFQMFJOZGVsOUtFMU1GMlBnS3lxWG02UG1rbTVwK2liOC9MWmRvcFAwSTZJS0JLMwp6UTg4YVc1NGRFQnBibmgwTG1OdmJUN0NqQVFRRmdvQVBnV0NhR1BSamdRTENRY0lDWkFmVmllYmtvWUEKNkFNVkNBb0VGZ0FDQVFJWkFRS2JBd0llQVJZaEJISi81N3VzazhZYkRsazdHUjlXSjV1U2hnRG9BQURPCmVRRUF1OFo0WUVJcmJpaUlnVDVhQzAxL2RJSVR4VHBUYkE2TFdjdUJGMHkvanpBQkFKVWVOb2k5ZzRuSgp5WmwyakhCbTNRV1FZV3BFNFhJaC93VEw2N2xXYXEwQXgxMEVhR1BSamhJS0t3WUJCQUdYVlFFRkFRRUgKUUxBM2FyTGNqaDNyZ3RYWnRydGx1RHB6QU1jWTU4LzRFNTEzMFZkTlBWcHpBd0VJQndBQS8wSEVMTUZCClhJc3E0dnd6Y2FuUWF3OHBwOFNWakY4TFhETVZCRnQrL1pNd0R4akNlQVFZRmdvQUtnV0NhR1BSamdtUQpIMVlubTVLR0FPZ0Ntd3dXSVFSeWYrZTdySlBHR3c1Wk94a2ZWaWVia29ZQTZBQUFiV1FBK3dheWdtV3kKWitFYm5hK3R0N2RRcVJRTHJERkFMZlUyNXR2WUdUQm8vVkpYQVB3STlXVUNwblQ4M3JwRTNRaUc5Q1YyCmpublRWVk03RUZaNHh2RXRqYU44Q1E9PQo9N29NRQotLS0tLUVORCBQR1AgUFJJVkFURSBLRVkgQkxPQ0stLS0tLQ==';
    const privateKyberKeyInBase64 =
      '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';
    const encryptedMessageInBase64 =
      'SHlicmlkTW9kZQ==$+ERu8fE9KVEUXV/Q6811nZjJaEMdbReuQ+Z6i6soratRlFGDBs1K4hvPL/vKYvhSrdKz0Hx1CSb7QhELGk4g7DBXtZp/ZG5qO48PQwLC4+X1Xv1YGhRMvBgmWUL231cnS399ZGoVXKUPUkUUy+aDmpTMuIbX5BjreoQR4x8FM8TCuO4425HOUiA2Ep3Om0Reg8YwibexwEYazS90qrCkPqN5uW5okw04l4H1fnoTnzULOxp9yKZnpLO/aX/HWAT63xOE0Ha2/5pB2doOnZHWNKoefOaYxU1zI2M7FCtEfqyJLohhGGFIcukuLmBix63ofByRCbhdeYPfVZnnxnVI2n8McyORA5cEFOkd5ajs3ePyMdA52BTULwKEpzahjPIxuEyUQ1khheVRJyadSdJwGh/wT9X0tt1/bxgdRfiWdLx+ikJ01w513ADHRIKBvpGZfX7FmK2YhBBeNni8WU1EmltGAZNnOIn8Ut0jfp1Qc0SAOiFYYLFQuTh0ZQUkDJjT7njBtq8ARBg6BvfctdrxaaZOQe+4A341Pr2Hb8jeva8MfdWCHIWVHPfWuDxavIrxhGhD+ydrPCq89oPAipA6QDG5AENdFDsCmd3hHKFAxc21rBEW0b0cTm03VL7izhtg5MSd8QNaGzrsSvZYseiTxRgY6Kfe1mSDMzmN3dwc0TRrWJtXc/v42Ayd6pUXmr/9wV6AL7gZ+peJbvrodjUhBGyujohO7ALMNmWueEzCm6ntlGoKHn8MZ1HfaDM3YIP7RsWG/uJtQYTb7+EzIghoh3h2rOmIy8ap4LmdkEl6xrI9oA16egZ0dxbVXaBwa3DD/+KQUGdBrJsHcnP3oT6rpBFD/9Hl029qWdUg7Q0fYObAeCPad+fin9P1eV3ynNEWeT6c9eH/rVYjB9W5rAo/eoRXMcsS3+AK4JNk7SxUTnnN/Cet1zhVh8GYRCQayXU6XjEjkAxlaKqXEMXNqCJjOn+lUBpfG/WSMSiwMjUr2HakqTJzPT4uSqv6hr+XUbO9$LS0tLS1CRUdJTiBQR1AgTUVTU0FHRS0tLS0tCgp3VjREdDVVM3NOL1k4M2NTQVFkQTR1M3JDSm03U2tuVThlb1V0Yzh3NGo3akZOWWw3bkpYQzBhR0lVZlYKcFZnd3hRV0FCSGFRT0p6NU0yanJtTERkdi9PS1BjME54R0tEeEdibFBmUmE1QkdhMFVBbTFZZ2RHV3QrClhSTTZHU1dQMHNDYUFWVzkzeHRaeUJ6MThwK1dsb1hBRk1zTUZHVkNHM3cyRHo2aGd0T0c2MGV1MnFIaQpOemdNTWJhejd5a0VNRE55Yk1DQjhmUzFLSngrdTc3UTEzZ2ZXNjBNRmxzYVhzSXdPWUFUbDhrU1drVzMKL21PQUhBS2hVRmdlbFo5bzcyYkJKOXdkeUNXRkJXZXowWDlxdVFMSWgxNWxlSXFiTnlPSjdsclZTMzNwCjNncmNTODBzWk8reXRIMU1nODRTS0hiT3FJMDBDdkx5c2tBNjhhY0x2RlpWMVIrUzJXUTJ3VjFUY0trTgpHQzdUVUZZRklyZzROemNia2ZCMk5tUldjYnJTU0dtQjE3cFNCME5JY1VRd204enZGYmo4VVRQckZVNngKaTZRQzdrb2FUSEhpbUsrMjM0ZlRlVjdaNkZGQk0vYnd2L2N4OVllQ2RqUTFmbFpjNkJOOVRnWmYvM3M0CmJnbkx5dFVMRURkbnV5TzRObG1QNUt1dG1UVlhudHA0cEo2bTNaMlpFNzhKaDdwR3JNem1MRldhUTloLwo0VDhmL085elVRWUg0d05CT2FqWW15NGNXb29XREo5QVlGZHRIK2FjVmp1ZXR5d1JrRU1wVXc9PQo9cEg2RgotLS0tLUVORCBQR1AgTUVTU0FHRS0tLS0tCg==';
    const testMnemonic =
      'until bonus summer risk chunk oyster census ability frown win pull steel measure employ rigid improve riot remind system earn inch broken chalk clip';

    const decryptedMnemonic = await hybridDecryptMessageWithPrivateKey({
      encryptedMessageInBase64,
      privateKeyInBase64,
      privateKyberKeyInBase64,
    });

    expect(decryptedMnemonic).toEqual(testMnemonic);
  });
});
