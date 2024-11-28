/**
 * @jest-environment jsdom
 */

import {
  getSha256,
  getSha256Hasher,
  getSha512FromHex,
  getRipemd160FromHex,
  extendSecret,
} from '../../../src/app/crypto/services/utils';

import { describe, expect, it } from 'vitest';
import { Sha256 } from 'asmcrypto.js';
import CryptoJS from 'crypto-js';
import { Buffer } from 'buffer';
import crypto from 'crypto';

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

describe('Test getSha256Hasher', () => {
  it('getSha256Hasher should give the same result as getSha256 for a single string', async () => {
    const message = 'Test message';
    const hasher = await getSha256Hasher();
    hasher.init();
    hasher.update(message);
    const result = hasher.digest();
    const expectedResult = await getSha256(message);
    expect(result).toBe(expectedResult);
  });

  it('getSha256Hasher should give the same result as getSha256 for an array', async () => {
    const messageArray = ['Test message 1', 'Test message 2', 'Test message 3', 'Test message 4'];
    const hasher = await getSha256Hasher();
    hasher.init();
    for (const message of messageArray) {
      hasher.update(message);
    }
    const result = hasher.digest();
    const expectedResult = await getSha256(messageArray.join(''));
    expect(result).toBe(expectedResult);
  });

  it('getSha256 should return the same result as asmcrypto.js', async () => {
    const messageArray = ['Test message 1', 'Test message 2', 'Test message 3', 'Test message 4'];
    const hasher = await getSha256Hasher();
    hasher.init();
    for (const message of messageArray) {
      hasher.update(Buffer.from(message));
    }
    const hashWasnResultStr = hasher.digest();
    const hashWasnResult = new Uint8Array(Buffer.from(hashWasnResultStr, 'hex'));

    const asmcryptoHasher = new Sha256();
    for (const message of messageArray) {
      asmcryptoHasher.process(Buffer.from(message));
    }
    asmcryptoHasher.finish();
    const asmcryptoResult = asmcryptoHasher.result;

    expect(hashWasnResult).toStrictEqual(asmcryptoResult);
  });
});
describe('Test getSha512 with NIST test vectors', () => {
  it('getSha512 should pass NIST test vector 1', async () => {
    const message = Buffer.from('abc').toString('hex');
    const result = await getSha512FromHex(message);
    const testResult =
      'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f';
    expect(result).toBe(testResult);
  });

  it('getSha512 should pass NIST test vector 2', async () => {
    const message = '';
    const result = await getSha512FromHex(message);
    const testResult =
      'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e';
    expect(result).toBe(testResult);
  });

  it('getSha512 should pass NIST test vector 3', async () => {
    const message = Buffer.from('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq').toString('hex');
    const result = await getSha512FromHex(message);
    const testResult =
      '204a8fc6dda82f0a0ced7beb8e08a41657c16ef468b228a8279be331a703c33596fd15c13b1b07f9aa1d3bea57789ca031ad85c7a71dd70354ec631238ca3445';
    expect(result).toBe(testResult);
  });

  it('getSha512 should pass NIST test vector 4', async () => {
    const message = Buffer.from(
      'abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu',
    ).toString('hex');
    const result = await getSha512FromHex(message);
    const testResult =
      '8e959b75dae313da8cf4f72814fc143f8f7779c6eb9f7fa17299aeadb6889018501d289e4900f7e4331b99dec4b5433ac7d329eeb6dd26545e96e55b874be909';
    expect(result).toBe(testResult);
  });

  it('getSha512 should pass NIST test vector 5', async () => {
    let message = '';
    for (let i = 0; i < 1000000; i++) {
      message += Buffer.from('a').toString('hex');
    }
    const result = await getSha512FromHex(message);
    const testResult =
      'e718483d0ce769644e2e42c7bc15b4638e1f98b13b2044285632a803afa973ebde0ff244877ea60a4cb0432ce577c31beb009c5c2c49aa2e4eadb217ad8cc09b';
    expect(result).toBe(testResult);
  });
});

describe('Test against other crypto libraries', () => {
  it('getSha256 should be identical to CryptoJS result for a test string', async () => {
    const message = 'Test between hash-wasm and CryptoJS';
    const result = await getSha256(message);
    const cryptoJSresult = CryptoJS.SHA256(message).toString(CryptoJS.enc.Hex);
    expect(result).toBe(cryptoJSresult);
  });

  it('getSha256 should be identical to CryptoJS result for an empty string', async () => {
    const message = '';
    const result = await getSha256(message);
    const cryptoJSresult = CryptoJS.SHA256(message).toString(CryptoJS.enc.Hex);
    expect(result).toBe(cryptoJSresult);
  });

  it('getRipemd160 should retrun the same result as crypto', async () => {
    const sha256Result = await getSha256('Test message');
    const result = await getRipemd160FromHex(sha256Result);
    const testResult = crypto.createHash('ripemd160').update(Buffer.from(sha256Result, 'hex')).digest('hex');
    expect(result).toBe(testResult);
  });

  it('getSha512 should retrun the same result as crypto', async () => {
    const input = await getSha256('Test message');
    const result = await getSha512FromHex(input);
    const testResult = crypto.createHash('sha512').update(Buffer.from(input, 'hex')).digest().toString('hex');
    expect(result).toBe(testResult);
  });
});

describe('Test getRipemd160 with test vectors published by the authors', () => {
  it('getRipemd160 should pass test 1', async () => {
    const message = '';
    const result = await getRipemd160FromHex(message);
    const testResult = '9c1185a5c5e9fc54612808977ee8f548b2258d31';
    expect(result).toBe(testResult);
  });

  it('getRipemd160 should pass test 2', async () => {
    const message = Buffer.from('a').toString('hex');
    const result = await getRipemd160FromHex(message);
    const testResult = '0bdc9d2d256b3ee9daae347be6f4dc835a467ffe';
    expect(result).toBe(testResult);
  });

  it('getRipemd160 should pass test 3', async () => {
    const message = Buffer.from('abc').toString('hex');
    const result = await getRipemd160FromHex(message);
    const testResult = '8eb208f7e05d987a9b044a8e98c6b087f15a0bfc';
    expect(result).toBe(testResult);
  });

  it('getRipemd160 should pass test 4', async () => {
    const message = Buffer.from('message digest').toString('hex');
    const result = await getRipemd160FromHex(message);
    const testResult = '5d0689ef49d2fae572b881b123a85ffa21595f36';
    expect(result).toBe(testResult);
  });

  it('getRipemd160 should pass test 5', async () => {
    const message = Buffer.from('abcdefghijklmnopqrstuvwxyz').toString('hex');
    const result = await getRipemd160FromHex(message);
    const testResult = 'f71c27109c692c1b56bbdceb5b9d2865b3708dbc';
    expect(result).toBe(testResult);
  });

  it('getRipemd160 should pass test 6', async () => {
    const message = Buffer.from('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq').toString('hex');
    const result = await getRipemd160FromHex(message);
    const testResult = '12a053384a9c0c88e405a06c27dcf49ada62eb2b';
    expect(result).toBe(testResult);
  });

  it('getRipemd160 should pass test 7', async () => {
    const message = Buffer.from('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789').toString('hex');
    const result = await getRipemd160FromHex(message);
    const testResult = 'b0e20b6e3116640286ed3a87a5713079b21f5189';
    expect(result).toBe(testResult);
  });

  it('getRipemd160 should pass test 8', async () => {
    let message = '';
    for (let i = 0; i < 8; i++) {
      message += Buffer.from('1234567890').toString('hex');
    }
    const result = await getRipemd160FromHex(message);
    const testResult = '9b752e45573d4b39f4dbd3323cab82bf63326bfb';
    expect(result).toBe(testResult);
  });

  it('getRipemd160 should pass test 9', async () => {
    let message = '';
    for (let i = 0; i < 1000000; i++) {
      message += Buffer.from('a').toString('hex');
    }
    const result = await getRipemd160FromHex(message);
    const testResult = '52783243c1697bdbe16d37f97f68f08325dc1528';
    expect(result).toBe(testResult);
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
