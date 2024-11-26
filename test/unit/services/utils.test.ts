/**
 * @jest-environment jsdom
 */

import {
  extendSecret,
  getPBKDF2,
  getArgon2,
  passToHash,
  hex2oldEncoding,
} from '../../../src/app/crypto/services/utils';

import { describe, expect, it } from 'vitest';
import { Buffer } from 'buffer';
import CryptoJS from 'crypto-js';

describe('Test extendSecret with blake3 test vectors', () => {
  it('extendSecret should pass test with input length 0 from blake3 team', async () => {
    const message = Buffer.from('');
    const result = await extendSecret(message, 1048);
    const testResult =
      'af1349b9f5f9a1a6a0404dea36dcc9499bcb25c9adc112b7cc9a93cae41f3262e00f03e7b69af26b7faaf09fcd333050338ddfe085b8cc869ca98b206c08243a26f5487789e8f660afe6c99ef9e0c52b92e7393024a80459cf91f476f9ffdbda7001c22e159b402631f277ca96f2defdf1078282314e763699a31c5363165421cce14d';
    expect(result).toBe(testResult);
  });

  it('extendSecret should pass test with input length 1 from blake3 team', async () => {
    const message = Buffer.from([0]);
    const result = await extendSecret(message, 1048);
    const testResult =
      '2d3adedff11b61f14c886e35afa036736dcd87a74d27b5c1510225d0f592e213c3a6cb8bf623e20cdb535f8d1a5ffb86342d9c0b64aca3bce1d31f60adfa137b358ad4d79f97b47c3d5e79f179df87a3b9776ef8325f8329886ba42f07fb138bb502f4081cbcec3195c5871e6c23e2cc97d3c69a613eba131e5f1351f3f1da786545e5';
    expect(result).toBe(testResult);
  });

  it('extendSecret should pass test with input length 2 from blake3 team', async () => {
    const message = Buffer.from([0, 1]);
    const result = await extendSecret(message, 1048);
    const testResult =
      '7b7015bb92cf0b318037702a6cdd81dee41224f734684c2c122cd6359cb1ee63d8386b22e2ddc05836b7c1bb693d92af006deb5ffbc4c70fb44d0195d0c6f252faac61659ef86523aa16517f87cb5f1340e723756ab65efb2f91964e14391de2a432263a6faf1d146937b35a33621c12d00be8223a7f1919cec0acd12097ff3ab00ab1';
    expect(result).toBe(testResult);
  });

  function getBuffer(length: number) {
    const result = Array(length);
    let byte = 0;
    for (let i = 0; i < length; i++) {
      result[i] = byte;
      byte += 1;
      if (byte > 250) {
        byte = 0;
      }
    }
    return Buffer.from(result);
  }
  it('extendSecret should pass test with input length 7 from blake3 team', async () => {
    const message = getBuffer(7);
    const result = await extendSecret(message, 1048);
    const testResult =
      '3f8770f387faad08faa9d8414e9f449ac68e6ff0417f673f602a646a891419fe66036ef6e6d1a8f54baa9fed1fc11c77cfb9cff65bae915045027046ebe0c01bf5a941f3bb0f73791d3fc0b84370f9f30af0cd5b0fc334dd61f70feb60dad785f070fef1f343ed933b49a5ca0d16a503f599a365a4296739248b28d1a20b0e2cc8975c';
    expect(result).toBe(testResult);
  });

  it('extendSecret should pass test with input length 63 from blake3 team', async () => {
    const message = getBuffer(63);
    const result = await extendSecret(message, 1048);
    const testResult =
      'e9bc37a594daad83be9470df7f7b3798297c3d834ce80ba85d6e207627b7db7b1197012b1e7d9af4d7cb7bdd1f3bb49a90a9b5dec3ea2bbc6eaebce77f4e470cbf4687093b5352f04e4a4570fba233164e6acc36900e35d185886a827f7ea9bdc1e5c3ce88b095a200e62c10c043b3e9bc6cb9b6ac4dfa51794b02ace9f98779040755';
    expect(result).toBe(testResult);
  });

  it('extendSecret should pass test with input length 1023 from blake3 team', async () => {
    const message = getBuffer(1023);
    const result = await extendSecret(message, 1048);
    const testResult =
      '10108970eeda3eb932baac1428c7a2163b0e924c9a9e25b35bba72b28f70bd11a182d27a591b05592b15607500e1e8dd56bc6c7fc063715b7a1d737df5bad3339c56778957d870eb9717b57ea3d9fb68d1b55127bba6a906a4a24bbd5acb2d123a37b28f9e9a81bbaae360d58f85e5fc9d75f7c370a0cc09b6522d9c8d822f2f28f485';
    expect(result).toBe(testResult);
  });

  it('extendSecret should pass test with input length 102400 from blake3 team', async () => {
    const message = getBuffer(102400);
    const result = await extendSecret(message, 1048);
    const testResult =
      'bc3e3d41a1146b069abffad3c0d44860cf664390afce4d9661f7902e7943e085e01c59dab908c04c3342b816941a26d69c2605ebee5ec5291cc55e15b76146e6745f0601156c3596cb75065a9c57f35585a52e1ac70f69131c23d611ce11ee4ab1ec2c009012d236648e77be9295dd0426f29b764d65de58eb7d01dd42248204f45f8e';
    expect(result).toBe(testResult);
  });
});

describe('Test getPBKDF2 with RFC 7914 test vectors', () => {
  it('getPBKDF2 should pass test 1 for PBKDF2-HMAC-SHA-256 from RFC 7914', async () => {
    const password = 'passwd';
    const salt = 'salt';
    const iterations = 1;
    const hashLength = 64;
    const result = await getPBKDF2(password, salt, iterations, hashLength);
    const testResult =
      '55ac046e56e3089fec1691c22544b605f94185216dde0465e68b9d57c20dacbc49ca9cccf179b645991664b39d77ef317c71b845b1e30bd509112041d3a19783';
    expect(result).toBe(testResult);
  });

  it('getPBKDF2 should pass test 2 for PBKDF2-HMAC-SHA-256 from RFC 7914', async () => {
    const password = 'Password';
    const salt = 'NaCl';
    const iterations = 80000;
    const hashLength = 64;
    const result = await getPBKDF2(password, salt, iterations, hashLength);
    const testResult =
      '4ddcd8f60b98be21830cee5ef22701f9641a4418d04c0414aeff08876b34ab56a1d425a1225833549adb841b51c9b3176a272bdebba1d078478f62b397f33c8d';
    expect(result).toBe(testResult);
  });
});

describe('Test getArgon2 with test vectors from the reference implementation that won Password Hashing Competition ', () => {
  it('getArgon2 should pass test 1', async () => {
    const password = 'password';
    const salt = 'somesalt';
    const parallelism = 1;
    const iterations = 2;
    const memorySize = 65536;
    const hashLength = 32;
    const result = await getArgon2(password, salt, parallelism, iterations, memorySize, hashLength, 'hex');
    const testResult = '09316115d5cf24ed5a15a31a3ba326e5cf32edc24702987c02b6566f61913cf7';
    expect(result).toBe(testResult);
  });

  it('getArgon2 should pass test 2', async () => {
    const password = 'password';
    const salt = 'somesalt';
    const parallelism = 1;
    const iterations = 2;
    const memorySize = 262144;
    const hashLength = 32;
    const result = await getArgon2(password, salt, parallelism, iterations, memorySize, hashLength, 'hex');
    const testResult = '78fe1ec91fb3aa5657d72e710854e4c3d9b9198c742f9616c2f085bed95b2e8c';
    expect(result).toBe(testResult);
  });

  it('getArgon2 should pass test 3', async () => {
    const password = 'password';
    const salt = 'somesalt';
    const parallelism = 1;
    const iterations = 2;
    const memorySize = 256;
    const hashLength = 32;
    const result = await getArgon2(password, salt, parallelism, iterations, memorySize, hashLength, 'hex');
    const testResult = '9dfeb910e80bad0311fee20f9c0e2b12c17987b4cac90c2ef54d5b3021c68bfe';
    expect(result).toBe(testResult);
  });

  it('getArgon2 should pass test 4', async () => {
    const password = 'password';
    const salt = 'somesalt';
    const parallelism = 2;
    const iterations = 2;
    const memorySize = 256;
    const hashLength = 32;
    const result = await getArgon2(password, salt, parallelism, iterations, memorySize, hashLength, 'hex');
    const testResult = '6d093c501fd5999645e0ea3bf620d7b8be7fd2db59c20d9fff9539da2bf57037';
    expect(result).toBe(testResult);
  });

  it('getArgon2 should pass test 5', async () => {
    const password = 'password';
    const salt = 'somesalt';
    const parallelism = 1;
    const iterations = 1;
    const memorySize = 65536;
    const hashLength = 32;
    const result = await getArgon2(password, salt, parallelism, iterations, memorySize, hashLength, 'hex');
    const testResult = 'f6a5adc1ba723dddef9b5ac1d464e180fcd9dffc9d1cbf76cca2fed795d9ca98';
    expect(result).toBe(testResult);
  });

  it('getArgon2 should pass test 6', async () => {
    const password = 'password';
    const salt = 'somesalt';
    const parallelism = 1;
    const iterations = 4;
    const memorySize = 65536;
    const hashLength = 32;
    const result = await getArgon2(password, salt, parallelism, iterations, memorySize, hashLength, 'hex');
    const testResult = '9025d48e68ef7395cca9079da4c4ec3affb3c8911fe4f86d1a2520856f63172c';
    expect(result).toBe(testResult);
  });

  it('getArgon2 should pass test 7', async () => {
    const password = 'differentpassword';
    const salt = 'somesalt';
    const parallelism = 1;
    const iterations = 2;
    const memorySize = 65536;
    const hashLength = 32;
    const result = await getArgon2(password, salt, parallelism, iterations, memorySize, hashLength, 'hex');
    const testResult = '0b84d652cf6b0c4beaef0dfe278ba6a80df6696281d7e0d2891b817d8c458fde';
    expect(result).toBe(testResult);
  });

  it('getArgon2 should pass test 8', async () => {
    const password = 'password';
    const salt = 'diffsalt';
    const parallelism = 1;
    const iterations = 2;
    const memorySize = 65536;
    const hashLength = 32;
    const result = await getArgon2(password, salt, parallelism, iterations, memorySize, hashLength, 'hex');
    const testResult = 'bdf32b05ccc42eb15d58fd19b1f856b113da1e9a5874fdcc544308565aa8141c';
    expect(result).toBe(testResult);
  });
});

describe('Test against other crypto libraries', () => {

  it('PBKDF2 should be identical to CryptoJS result for a test string', async () => {
    const password = 'Test between hash-wasm and CryptoJS';
    const salt = 'This is salt';
    const result = await getPBKDF2(password, salt);
    const cryptoJSresult = CryptoJS.PBKDF2(password, salt, { keySize: 256 / 32, iterations: 10000 }).toString(
      CryptoJS.enc.Hex,
    );
    expect(result).toBe(cryptoJSresult);
  });

  it('PBKDF2 should be identical to CryptoJS result for an empty string', async () => {
    const password = '';
    const salt = 'This is salt';
    const result = await getPBKDF2(password, salt);
    const cryptoJSresult = CryptoJS.PBKDF2(password, salt, { keySize: 256 / 32, iterations: 10000 }).toString(
      CryptoJS.enc.Hex,
    );
    expect(result).toBe(cryptoJSresult);
  });
});

describe('Test passToHash', () => {
  it('passToHash should be identical to getArgon2 for an empry salt', async () => {
    const password = 'Test password';
    const result = await passToHash({ password });
    const salt: string = result.salt.split('$').pop() ?? '';
    const argon2Result = await getArgon2(password, salt);
    expect(result.hash).toBe(argon2Result);
  });

  it('passToHash should be identical to getArgon2 in argon mode', async () => {
    const password = 'Test password';
    const salt = 'argon2id$6c7c6b9938cb8bd0baf1c2d2171b96a0';
    const result = await passToHash({ password, salt });
    const argon2Result = await getArgon2(password, '6c7c6b9938cb8bd0baf1c2d2171b96a0');
    expect(result.hash).toBe(argon2Result);
  });

  it('passToHash should be identical to getPBKDF2 in PBKDF2 mode', async () => {
    const password = 'Test password';
    const salt = '1238cb8bd0baf1c2d2171b96a0';
    const result = await passToHash({ password, salt });
    const encoded_salt = hex2oldEncoding(salt);
    const pbkdf2Result = await getPBKDF2(password, encoded_salt);
    expect(result.hash).toBe(pbkdf2Result);
  });

  it('passToHash should return the same result for the given password and salt (argon mode)', async () => {
    const password = 'Test password';
    const salt = 'argon2id$6c7c6b9938cb8bd0baf1c2d2171b96a0';
    const result1 = await passToHash({ password, salt });
    const result2 = await passToHash({ password, salt });
    expect(result1.hash).toBe(result2.hash);
    expect(result1.salt).toBe(result2.salt);
  });

  it('passToHash should return the same result for the same pwd and salt (PBKDF2)', async () => {
    const password = 'Test password';
    const salt = '6c7c6b9938cb8bd0baf1c2d2171b96a0';
    const result1 = await passToHash({ password, salt });
    const result2 = await passToHash({ password, salt });
    expect(result1.hash).toBe(result2.hash);
    expect(result1.salt).toBe(result2.salt);
  });

  it('passToHash should return the same result when re-computed', async () => {
    const password = 'Test password';
    const salt = 'argon2id$6c7c6b9938cb8bd0baf1c2d2171b96a0';
    const result1 = await passToHash({ password, salt });
    const result2 = await passToHash({ password, salt: result1.salt });
    expect(result1.hash).toBe(result2.hash);
    expect(result1.salt).toBe(result2.salt);
  });

  interface PassObjectInterface {
    salt?: string | null;
    password: string;
  }

  function oldPassToHash(passObject: PassObjectInterface): { salt: string; hash: string } {
    const salt = passObject.salt ? CryptoJS.enc.Hex.parse(passObject.salt) : CryptoJS.lib.WordArray.random(128 / 8);
    const hash = CryptoJS.PBKDF2(passObject.password, salt, { keySize: 256 / 32, iterations: 10000 });
    const hashedObjetc = {
      salt: salt.toString(),
      hash: hash.toString(),
    };

    return hashedObjetc;
  }

  it('passToHash should return the same result for PBKDF2 as the old function', async () => {
    const password = 'Test password';
    const salt = '7121910994f21cd848c55e90835d7bd8';
   
    const result = await passToHash({ password, salt });
    const oldResult = oldPassToHash({ password, salt });
    expect(result.salt).toBe(oldResult.salt);
    expect(result.hash).toBe(oldResult.hash);
  });

  it('passToHash should return sucessfully verify old function hash', async () => {
    const password = 'Test password';
    const oldResult = oldPassToHash({ password });
    const result = await passToHash({ password, salt: oldResult.salt });

    expect(result.salt).toBe(oldResult.salt);
    expect(result.hash).toBe(oldResult.hash);
  });

  it('passToHash should throw an error if salt is empty', async () => {
    const password = 'Test password';
    const salt = 'argon2id$';
    await expect(passToHash({ password, salt })).rejects.toThrow('Salt must be specified');
  });

  it('passToHash should throw an error if password is empty', async () => {
    const password = '';
    const salt = 'argon2id$6c7c6b9938cb8bd0baf1c2d2171b96a0';
    await expect(passToHash({ password, salt })).rejects.toThrow('Password must be specified');
  });

  it('passToHash should throw an error if salt is less than 8 bytes', async () => {
    const password = 'Test password';
    const salt = 'argon2id$6c';
    await expect(passToHash({ password, salt })).rejects.toThrow('Salt should be at least 8 bytes long');
  });
});