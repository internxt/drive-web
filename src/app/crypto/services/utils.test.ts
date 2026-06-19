import { describe, it, expect } from 'vitest';
import { hmacSha512, deriveHmacKey, getFileHmacFromShardHashes } from './utils';

describe('hmacSha512', () => {
  const key = Buffer.alloc(32, 0x01);

  it('returns a 128-character lowercase hex string', async () => {
    const result = await hmacSha512(key, Buffer.from('test'));
    expect(result).toHaveLength(128);
    expect(result).toMatch(/^[0-9a-f]+$/);
  });

  it('is deterministic', async () => {
    const data = Buffer.from('same data');
    expect(await hmacSha512(key, data)).toBe(await hmacSha512(key, data));
  });

  it('produces different output for different keys', async () => {
    const data = Buffer.from('data');
    const r1 = await hmacSha512(Buffer.alloc(32, 0x01), data);
    const r2 = await hmacSha512(Buffer.alloc(32, 0x02), data);
    expect(r1).not.toBe(r2);
  });

  it('produces different output for different data', async () => {
    const r1 = await hmacSha512(key, Buffer.from('data1'));
    const r2 = await hmacSha512(key, Buffer.from('data2'));
    expect(r1).not.toBe(r2);
  });
});

describe('deriveHmacKey', () => {
  it('returns a 64-byte Buffer', async () => {
    const result = await deriveHmacKey(Buffer.alloc(32, 0x01));
    expect(result).toHaveLength(64);
  });

  it('is deterministic', async () => {
    const fileKey = Buffer.alloc(32, 0x01);
    const r1 = await deriveHmacKey(fileKey);
    const r2 = await deriveHmacKey(fileKey);
    expect(r1.toString('hex')).toBe(r2.toString('hex'));
  });

  it('produces a different key for different file keys', async () => {
    const r1 = await deriveHmacKey(Buffer.alloc(32, 0x01));
    const r2 = await deriveHmacKey(Buffer.alloc(32, 0x02));
    expect(r1.toString('hex')).not.toBe(r2.toString('hex'));
  });

  it('derived key is different from the original file key', async () => {
    const fileKey = Buffer.alloc(32, 0x01);
    const derived = await deriveHmacKey(fileKey);
    expect(derived.subarray(0, 32).toString('hex')).not.toBe(fileKey.toString('hex'));
  });
});

describe('getFileHmacFromShardHashes', () => {
  const fileKey = Buffer.alloc(32, 0x01);

  it('returns a 128-character hex string', async () => {
    const result = await getFileHmacFromShardHashes(fileKey, ['aabbcc']);
    expect(result).toHaveLength(128);
    expect(result).toMatch(/^[0-9a-f]+$/);
  });

  it('is deterministic', async () => {
    const r1 = await getFileHmacFromShardHashes(fileKey, ['aabbcc']);
    const r2 = await getFileHmacFromShardHashes(fileKey, ['aabbcc']);
    expect(r1).toBe(r2);
  });

  it('produces different output for different file keys', async () => {
    const r1 = await getFileHmacFromShardHashes(Buffer.alloc(32, 0x01), ['aabbcc']);
    const r2 = await getFileHmacFromShardHashes(Buffer.alloc(32, 0x02), ['aabbcc']);
    expect(r1).not.toBe(r2);
  });

  it('produces different output for different shard hashes', async () => {
    const r1 = await getFileHmacFromShardHashes(fileKey, ['aabbcc']);
    const r2 = await getFileHmacFromShardHashes(fileKey, ['ddeeff']);
    expect(r1).not.toBe(r2);
  });

  it('computes HMAC over the concatenated bytes of all shard hashes', async () => {
    const hash1 = 'aabbcc';
    const hash2 = 'ddeeff';
    const resultMulti = await getFileHmacFromShardHashes(fileKey, [hash1, hash2]);
    const resultSingle = await getFileHmacFromShardHashes(fileKey, [hash1 + hash2]);
    expect(resultMulti).toBe(resultSingle);
  });
});