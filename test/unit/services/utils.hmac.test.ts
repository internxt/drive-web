/**
 * @jest-environment jsdom
 */

import { getHmacSha512FromHexKey } from '../../../src/app/crypto/services/utils';

import { describe, expect, it } from 'vitest';
import { sha512HmacBuffer, sha512HmacBufferFromHex } from '@internxt/inxt-js/build/lib/utils/crypto';
import { generateHMAC } from '../../../src/app/network/crypto';
import { ShardMeta } from '@internxt/inxt-js/build/lib/models';
import { Buffer } from 'buffer';

describe('HMAC should work as before', () => {
  globalThis.Buffer = Buffer;
  it('hmac should generate the same encryptionKey as before', async () => {
    const BUCKET_META_MAGIC = [
      66, 150, 71, 16, 50, 114, 88, 160, 163, 35, 154, 65, 162, 213, 226, 215, 70, 138, 57, 61, 52, 19, 210, 170, 38,
      164, 162, 200, 86, 201, 2, 81,
    ];
    const bucketKey = 'f5cbcc2687293589d504e0f723adf62ed07f8f20f429e82a9576e7322978c245';
    const resultHex = await getHmacSha512FromHexKey(bucketKey, [Buffer.from(BUCKET_META_MAGIC)]);
    const result = Buffer.from(resultHex, 'hex').subarray(0, 32);
    const oldResult = sha512HmacBufferFromHex(bucketKey).update(Buffer.from(BUCKET_META_MAGIC)).digest().slice(0, 32);
    expect(result).toStrictEqual(oldResult);
  });

  it('hmac should generate the same encryptionIv as before', async () => {
    const bucketKey = 'f5cbcc2687293589d504e0f723adf62ed07f8f20f429e82a9576e7322978c245';
    const bucketId = 'Test bucket ID';
    const filename = 'Test filename';
    const resultHex = await getHmacSha512FromHexKey(bucketKey, [bucketId, filename]);
    const result = Buffer.from(resultHex, 'hex').subarray(0, 32);
    const oldResult = sha512HmacBufferFromHex(bucketKey).update(bucketId).update(filename).digest().slice(0, 32);
    expect(result).toStrictEqual(oldResult);
  });

  it('hmac should generate the same hmac as before', async () => {
    const encryptionKey = Buffer.from('0b68dcbb255a4e654bbf361e73cf1b98', 'hex');
    const shardMeta = {
      challenges_as_str: [],
      hash: '',
      index: 0,
      parity: false,
      size: 0,
      tree: [],
    };
    const result = await generateHMAC([shardMeta], encryptionKey);

    function oldGenerateHMAC(
      shardMetas: Omit<ShardMeta, 'challenges' | 'challenges_as_str' | 'tree'>[],
      encryptionKey: Buffer,
    ): Buffer {
      const shardHashesSorted = [...shardMetas].sort((sA, sB) => sA.index - sB.index);
      const hmac = sha512HmacBuffer(encryptionKey);

      for (const shardMeta of shardHashesSorted) {
        hmac.update(Buffer.from(shardMeta.hash, 'hex'));
      }

      return hmac.digest();
    }
    const oldResult = oldGenerateHMAC([shardMeta], encryptionKey).toString('hex');
    expect(result).toStrictEqual(oldResult);
  });
});

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
