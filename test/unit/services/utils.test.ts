/**
 * @jest-environment jsdom
 */

import {
  extendSecret,
  getPBKDF2,
  getHmacSha512FromHexKey,
  getSha256,
  getSha512,
  getRipemd160,
  getArgon2,
  passToHash,
} from '../../../src/app/crypto/services/utils';

import { describe, expect, it } from 'vitest';
import { Buffer } from 'buffer';
import CryptoJS from 'crypto-js';

describe('Test HMAC with RFC 4231 test vectors', () => {
  it('hmac should pass RFC 4231 test case 1', async () => {
    const encryptionKey = '0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b';
    const data = ['Hi There'];
    const result = await getHmacSha512FromHexKey(encryptionKey, data);
    const rfcResult =
      '87aa7cdea5ef619d4ff0b4241a1d6cb02379f4e2ce4ec2787ad0b30545e17cdedaa833b7d6b8a702038b274eaea3f4e4be9d914eeb61f1702e696c203a126854';
    expect(result).toBe(rfcResult);
  });

  it('hmac should pass RFC 4231 test case 2', async () => {
    const encryptionKey = '4a656665';
    const data = ['what do ya want ', 'for nothing?'];
    const result = await getHmacSha512FromHexKey(encryptionKey, data);
    const rfcResult =
      '164b7a7bfcf819e2e395fbe73b56e0a387bd64222e831fd610270cd7ea2505549758bf75c05a994a6d034f65f8f0e6fdcaeab1a34d4a6b4b636e070a38bce737';
    expect(result).toBe(rfcResult);
  });

  it('hmac should pass RFC 4231 test case 3', async () => {
    const encryptionKey = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const data = [
      Buffer.from('dddddddddddddddddddddddddddddddd', 'hex'),
      Buffer.from('dddddddddddddddddddddddddddddddd', 'hex'),
      Buffer.from('dddddddddddddddddddddddddddddddd', 'hex'),
      Buffer.from('dddd', 'hex'),
    ];
    const result = await getHmacSha512FromHexKey(encryptionKey, data);
    const rfcResult =
      'fa73b0089d56a284efb0f0756c890be9b1b5dbdd8ee81a3655f83e33b2279d39bf3e848279a722c806b485a47e67c807b946a337bee8942674278859e13292fb';
    expect(result).toBe(rfcResult);
  });

  it('hmac should pass RFC 4231 test case 4', async () => {
    const encryptionKey = '0102030405060708090a0b0c0d0e0f10111213141516171819';
    const data = [
      Buffer.from('cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd', 'hex'),
      Buffer.from('cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd', 'hex'),
      Buffer.from('cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd', 'hex'),
      Buffer.from('cdcd', 'hex'),
    ];
    const result = await getHmacSha512FromHexKey(encryptionKey, data);
    const rfcResult =
      'b0ba465637458c6990e5a8c5f61d4af7e576d97ff94b872de76f8050361ee3dba91ca5c11aa25eb4d679275cc5788063a5f19741120c4f2de2adebeb10a298dd';
    expect(result).toBe(rfcResult);
  });

  it('hmac should pass RFC 4231 test case 5', async () => {
    const encryptionKey = '0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c';
    const data = ['Test With Trunca', 'tion'];
    const result = await getHmacSha512FromHexKey(encryptionKey, data);
    const rfcResult = '415fad6271580a531d4179bc891d87a6';
    expect(result.slice(0, 32)).toBe(rfcResult);
  });

  it('hmac should pass RFC 4231 test case 6', async () => {
    const encryptionKey =
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const data = ['Test Using Large', 'r Than Block-Siz', 'e Key - Hash Key', ' First'];
    const result = await getHmacSha512FromHexKey(encryptionKey, data);
    const rfcResult =
      '80b24263c7c1a3ebb71493c1dd7be8b49b46d1f41b4aeec1121b013783f8f3526b56d037e05f2598bd0fd2215d6a1e5295e64f73f63f0aec8b915a985d786598';
    expect(result).toBe(rfcResult);
  });

  it('hmac should pass RFC 4231 test case 7', async () => {
    const encryptionKey =
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const data = [
      'This is a test u',
      'sing a larger th',
      'an block-size ke',
      'y and a larger t',
      'han block-size d',
      'ata. The key nee',
      'ds to be hashed ',
      'before being use',
      'd by the HMAC al',
      'gorithm.',
    ];
    const result = await getHmacSha512FromHexKey(encryptionKey, data);
    const rfcResult =
      'e37b6a775dc87dbaa4dfa9f96e5e3ffddebd71f8867289865df5a32d20cdc944b6022cac3c4982b10d5eeb55c3e4de15134676fb6de0446065c97440fa8c6a58';
    expect(result).toBe(rfcResult);
  });
});

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
    const passord = 'passwd';
    const salt = 'salt';
    const iterations = 1;
    const hashLength = 64;
    const result = await getPBKDF2(passord, salt, iterations, hashLength);
    const testResult =
      '55ac046e56e3089fec1691c22544b605f94185216dde0465e68b9d57c20dacbc49ca9cccf179b645991664b39d77ef317c71b845b1e30bd509112041d3a19783';
    expect(result).toBe(testResult);
  });

  it('getPBKDF2 should pass test 2 for PBKDF2-HMAC-SHA-256 from RFC 7914', async () => {
    const passord = 'Password';
    const salt = 'NaCl';
    const iterations = 80000;
    const hashLength = 64;
    const result = await getPBKDF2(passord, salt, iterations, hashLength);
    const testResult =
      '4ddcd8f60b98be21830cee5ef22701f9641a4418d04c0414aeff08876b34ab56a1d425a1225833549adb841b51c9b3176a272bdebba1d078478f62b397f33c8d';
    expect(result).toBe(testResult);
  });
});

describe('Test getSha256 with NIST test vectors', () => {
  it('getSha256 should pass NIST test vector 1', async () => {
    const message = 'abc';
    const result = await getSha256(message);
    const testResult = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
    expect(result).toBe(testResult);
  });

  it('getSha256 should pass NIST test vector 2', async () => {
    const message = '';
    const result = await getSha256(message);
    const testResult = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    expect(result).toBe(testResult);
  });

  it('getSha256 should pass NIST test vector 3', async () => {
    const message = 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq';
    const result = await getSha256(message);
    const testResult = '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1';
    expect(result).toBe(testResult);
  });

  it('getSha256 should pass NIST test vector 4', async () => {
    const message =
      'abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu';
    const result = await getSha256(message);
    const testResult = 'cf5b16a778af8380036ce59e7b0492370b249b11e8f07a51afac45037afee9d1';
    expect(result).toBe(testResult);
  });

  it('getSha256 should pass NIST test vector 5', async () => {
    let message = '';
    for (let i = 0; i < 1000000; i++) {
      message += 'a';
    }
    const result = await getSha256(message);
    const testResult = 'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0';
    expect(result).toBe(testResult);
  });
});

describe('Test getSha512 with NIST test vectors', () => {
  it('getSha512 should pass NIST test vector 1', async () => {
    const message = 'abc';
    const result = await getSha512(message);
    const testResult =
      'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f';
    expect(result).toBe(testResult);
  });

  it('getSha512 should pass NIST test vector 2', async () => {
    const message = '';
    const result = await getSha512(message);
    const testResult =
      'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e';
    expect(result).toBe(testResult);
  });

  it('getSha512 should pass NIST test vector 3', async () => {
    const message = 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq';
    const result = await getSha512(message);
    const testResult =
      '204a8fc6dda82f0a0ced7beb8e08a41657c16ef468b228a8279be331a703c33596fd15c13b1b07f9aa1d3bea57789ca031ad85c7a71dd70354ec631238ca3445';
    expect(result).toBe(testResult);
  });

  it('getSha512 should pass NIST test vector 4', async () => {
    const message =
      'abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu';
    const result = await getSha512(message);
    const testResult =
      '8e959b75dae313da8cf4f72814fc143f8f7779c6eb9f7fa17299aeadb6889018501d289e4900f7e4331b99dec4b5433ac7d329eeb6dd26545e96e55b874be909';
    expect(result).toBe(testResult);
  });

  it('getSha512 should pass NIST test vector 5', async () => {
    let message = '';
    for (let i = 0; i < 1000000; i++) {
      message += 'a';
    }
    const result = await getSha512(message);
    const testResult =
      'e718483d0ce769644e2e42c7bc15b4638e1f98b13b2044285632a803afa973ebde0ff244877ea60a4cb0432ce577c31beb009c5c2c49aa2e4eadb217ad8cc09b';
    expect(result).toBe(testResult);
  });
});

describe('Test getRipemd160 with test vectors published by the authors', () => {
  it('getRipemd160 should pass test 1', async () => {
    const message = '';
    const result = await getRipemd160(message);
    const testResult = '9c1185a5c5e9fc54612808977ee8f548b2258d31';
    expect(result).toBe(testResult);
  });

  it('getRipemd160 should pass test 2', async () => {
    const message = 'a';
    const result = await getRipemd160(message);
    const testResult = '0bdc9d2d256b3ee9daae347be6f4dc835a467ffe';
    expect(result).toBe(testResult);
  });

  it('getRipemd160 should pass test 3', async () => {
    const message = 'abc';
    const result = await getRipemd160(message);
    const testResult = '8eb208f7e05d987a9b044a8e98c6b087f15a0bfc';
    expect(result).toBe(testResult);
  });

  it('getRipemd160 should pass test 4', async () => {
    const message = 'message digest';
    const result = await getRipemd160(message);
    const testResult = '5d0689ef49d2fae572b881b123a85ffa21595f36';
    expect(result).toBe(testResult);
  });

  it('getRipemd160 should pass test 5', async () => {
    const message = 'abcdefghijklmnopqrstuvwxyz';
    const result = await getRipemd160(message);
    const testResult = 'f71c27109c692c1b56bbdceb5b9d2865b3708dbc';
    expect(result).toBe(testResult);
  });

  it('getRipemd160 should pass test 6', async () => {
    const message = 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq';
    const result = await getRipemd160(message);
    const testResult = '12a053384a9c0c88e405a06c27dcf49ada62eb2b';
    expect(result).toBe(testResult);
  });

  it('getRipemd160 should pass test 7', async () => {
    const message = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const result = await getRipemd160(message);
    const testResult = 'b0e20b6e3116640286ed3a87a5713079b21f5189';
    expect(result).toBe(testResult);
  });

  it('getRipemd160 should pass test 8', async () => {
    let message = '';
    for (let i = 0; i < 8; i++) {
      message += '1234567890';
    }
    const result = await getRipemd160(message);
    const testResult = '9b752e45573d4b39f4dbd3323cab82bf63326bfb';
    expect(result).toBe(testResult);
  });

  it('getRipemd160 should pass test 9', async () => {
    let message = '';
    for (let i = 0; i < 1000000; i++) {
      message += 'a';
    }
    const result = await getRipemd160(message);
    const testResult = '52783243c1697bdbe16d37f97f68f08325dc1528';
    expect(result).toBe(testResult);
  });
});

describe('Test getArgon2 with test vectors from the reference implementation that won Password Hashing Competition ', () => {
  it('getArgon2 should pass test 1', async () => {
    const passord = 'password';
    const salt = 'somesalt';
    const parallelism = 1;
    const iterations = 2;
    const memorySize = 65536;
    const hashLength = 32;
    const result = await getArgon2(passord, salt, parallelism, iterations, memorySize, hashLength, 'hex');
    const testResult = '09316115d5cf24ed5a15a31a3ba326e5cf32edc24702987c02b6566f61913cf7';
    expect(result).toBe(testResult);
  });

  it('getArgon2 should pass test 2', async () => {
    const passord = 'password';
    const salt = 'somesalt';
    const parallelism = 1;
    const iterations = 2;
    const memorySize = 262144;
    const hashLength = 32;
    const result = await getArgon2(passord, salt, parallelism, iterations, memorySize, hashLength, 'hex');
    const testResult = '78fe1ec91fb3aa5657d72e710854e4c3d9b9198c742f9616c2f085bed95b2e8c';
    expect(result).toBe(testResult);
  });

  it('getArgon2 should pass test 3', async () => {
    const passord = 'password';
    const salt = 'somesalt';
    const parallelism = 1;
    const iterations = 2;
    const memorySize = 256;
    const hashLength = 32;
    const result = await getArgon2(passord, salt, parallelism, iterations, memorySize, hashLength, 'hex');
    const testResult = '9dfeb910e80bad0311fee20f9c0e2b12c17987b4cac90c2ef54d5b3021c68bfe';
    expect(result).toBe(testResult);
  });

  it('getArgon2 should pass test 4', async () => {
    const passord = 'password';
    const salt = 'somesalt';
    const parallelism = 2;
    const iterations = 2;
    const memorySize = 256;
    const hashLength = 32;
    const result = await getArgon2(passord, salt, parallelism, iterations, memorySize, hashLength, 'hex');
    const testResult = '6d093c501fd5999645e0ea3bf620d7b8be7fd2db59c20d9fff9539da2bf57037';
    expect(result).toBe(testResult);
  });

  it('getArgon2 should pass test 5', async () => {
    const passord = 'password';
    const salt = 'somesalt';
    const parallelism = 1;
    const iterations = 1;
    const memorySize = 65536;
    const hashLength = 32;
    const result = await getArgon2(passord, salt, parallelism, iterations, memorySize, hashLength, 'hex');
    const testResult = 'f6a5adc1ba723dddef9b5ac1d464e180fcd9dffc9d1cbf76cca2fed795d9ca98';
    expect(result).toBe(testResult);
  });

  it('getArgon2 should pass test 6', async () => {
    const passord = 'password';
    const salt = 'somesalt';
    const parallelism = 1;
    const iterations = 4;
    const memorySize = 65536;
    const hashLength = 32;
    const result = await getArgon2(passord, salt, parallelism, iterations, memorySize, hashLength, 'hex');
    const testResult = '9025d48e68ef7395cca9079da4c4ec3affb3c8911fe4f86d1a2520856f63172c';
    expect(result).toBe(testResult);
  });

  it('getArgon2 should pass test 7', async () => {
    const passord = 'differentpassword';
    const salt = 'somesalt';
    const parallelism = 1;
    const iterations = 2;
    const memorySize = 65536;
    const hashLength = 32;
    const result = await getArgon2(passord, salt, parallelism, iterations, memorySize, hashLength, 'hex');
    const testResult = '0b84d652cf6b0c4beaef0dfe278ba6a80df6696281d7e0d2891b817d8c458fde';
    expect(result).toBe(testResult);
  });

  it('getArgon2 should pass test 8', async () => {
    const passord = 'password';
    const salt = 'diffsalt';
    const parallelism = 1;
    const iterations = 2;
    const memorySize = 65536;
    const hashLength = 32;
    const result = await getArgon2(passord, salt, parallelism, iterations, memorySize, hashLength, 'hex');
    const testResult = 'bdf32b05ccc42eb15d58fd19b1f856b113da1e9a5874fdcc544308565aa8141c';
    expect(result).toBe(testResult);
  });
});

describe('Test against cryptoJS', () => {
  it('SHA256 should be identical to CryptoJS result for a test string', async () => {
    const message = 'Test between hash-wasm and CryptoJS';
    const result = await getSha256(message);
    const cryptoJSresult = CryptoJS.SHA256(message).toString(CryptoJS.enc.Hex);
    expect(result).toBe(cryptoJSresult);
  });

  it('SHA256 should be identical to CryptoJS result for an empty string', async () => {
    const message = '';
    const result = await getSha256(message);
    const cryptoJSresult = CryptoJS.SHA256(message).toString(CryptoJS.enc.Hex);
    expect(result).toBe(cryptoJSresult);
  });

  it('HMAC-SHA512 should be identical to CryptoJS result for a test string', async () => {
    const message = 'Test between hash-wasm and CryptoJS';
    const key = '0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b';
    const result = await getHmacSha512FromHexKey(key, [message]);
    const cryptoJSresult = CryptoJS.HmacSHA512(message, CryptoJS.enc.Hex.parse(key)).toString(CryptoJS.enc.Hex);
    expect(result).toBe(cryptoJSresult);
  });

  it('HMAC-SHA512 should be identical to CryptoJS result for an empty string', async () => {
    const message = '';
    const key = '0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b';
    const result = await getHmacSha512FromHexKey(key, [message]);
    const cryptoJSresult = CryptoJS.HmacSHA512(message, CryptoJS.enc.Hex.parse(key)).toString(CryptoJS.enc.Hex);
    expect(result).toBe(cryptoJSresult);
  });

  it('SHA512 should be identical to CryptoJS result for a test string', async () => {
    const message = 'Test between hash-wasm and CryptoJS';
    const result = await getSha512(message);
    const cryptoJSresult = CryptoJS.SHA512(message).toString(CryptoJS.enc.Hex);
    expect(result).toBe(cryptoJSresult);
  });

  it('SHA512 should be identical to CryptoJS result for an empty string', async () => {
    const message = '';
    const result = await getSha512(message);
    const cryptoJSresult = CryptoJS.SHA512(message).toString(CryptoJS.enc.Hex);
    expect(result).toBe(cryptoJSresult);
  });

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

  it('ripemd160 should be identical to CryptoJS result for a test string', async () => {
    const message = 'Test between hash-wasm and CryptoJS';
    const result = await getRipemd160(message);
    const cryptoJSresult = CryptoJS.RIPEMD160(message).toString(CryptoJS.enc.Hex);
    expect(result).toBe(cryptoJSresult);
  });

  it('ripemd160 should be identical to CryptoJS result for an empty string', async () => {
    const message = '';
    const result = await getRipemd160(message);
    const cryptoJSresult = CryptoJS.RIPEMD160(message).toString(CryptoJS.enc.Hex);
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

  it('passToHash should be identical to getArgon2(PBKDF2) in hybrid mode', async () => {
    const password = 'Test password';
    const salt = 'hybrid$1238cb8bd0baf1c2d2171b96a0$6c7c6b9938cb8bd0baf1c2d2171b96a0';
    const result = await passToHash({ password, salt });
    const oldHash = await getPBKDF2(password, '1238cb8bd0baf1c2d2171b96a0');
    const argon2Result = await getArgon2(oldHash, '6c7c6b9938cb8bd0baf1c2d2171b96a0');
    expect(result.hash).toBe(argon2Result);
  });

  it('passToHash should return the same result for the given password and salt (argon mode)', async () => {
    const password = 'Test password';
    const salt = 'argon2id$6c7c6b9938cb8bd0baf1c2d2171b96a0';
    const result1 = await passToHash({ password, salt });
    const result2 = await passToHash({ password, salt });
    expect(result1.hash).toBe(result2.hash);
    expect(result1.salt).toBe(result2.salt);
  });

  it('passToHash should return the same result for the given password and salt (hybrid mode)', async () => {
    const password = 'Test password';
    const salt = 'hybrid$6c7c6b9938cb8bd0baf1c2d2171b96a0$6c7c6b9938cb8bd0baf1c2d2171b96a0';
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

  it('passToHash should throw an error if salt has incorrect format', async () => {
    const password = 'Test password';
    const salt = '6c7c6b9938cb8bd0baf1c2d2171b96a0';
    await expect(passToHash({ password, salt })).rejects.toThrow('Incorrect salt format');
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
