import { getSha512Combined } from '../../../src/app/crypto/services/utils';

import { describe, expect, it } from 'vitest';

import { Buffer } from 'buffer';
import * as crypto from 'crypto';

describe('getSha512Combined tests', () => {
  globalThis.Buffer = Buffer;

  it('should generate SHA512 hash from combined key and data', async () => {
    const key = Buffer.from('test_key_data');
    const data = Buffer.from('test_data_content');

    const result = await getSha512Combined(key, data);

    expect(result).toMatch(/^[a-f0-9]{128}$/);
    expect(result.length).toBe(128);
  });

  it('should generate consistent results for same inputs', async () => {
    const key = Buffer.from('consistent_key');
    const data = Buffer.from('consistent_data');

    const result1 = await getSha512Combined(key, data);
    const result2 = await getSha512Combined(key, data);

    expect(result1).toBe(result2);
  });

  it('should generate different results for different keys', async () => {
    const key1 = Buffer.from('key_one');
    const key2 = Buffer.from('key_two');
    const data = Buffer.from('same_data');

    const result1 = await getSha512Combined(key1, data);
    const result2 = await getSha512Combined(key2, data);

    expect(result1).not.toBe(result2);
  });

  it('should generate different results for different data', async () => {
    const key = Buffer.from('same_key');
    const data1 = Buffer.from('data_one');
    const data2 = Buffer.from('data_two');

    const result1 = await getSha512Combined(key, data1);
    const result2 = await getSha512Combined(key, data2);

    expect(result1).not.toBe(result2);
  });

  it('should handle empty buffers', async () => {
    const key = Buffer.alloc(0);
    const data = Buffer.alloc(0);

    const result = await getSha512Combined(key, data);

    expect(result).toMatch(/^[a-f0-9]{128}$/);
  });

  it('should produce same result as crypto.createHash for combined data', async () => {
    const key = Buffer.from('test_key');
    const data = Buffer.from('test_data');

    const result = await getSha512Combined(key, data);

    const expectedHash = crypto.createHash('sha512').update(key).update(data).digest('hex');

    expect(result).toBe(expectedHash);
  });

  it('should handle large buffers', async () => {
    const key = Buffer.alloc(1024, 'a');
    const data = Buffer.alloc(2048, 'b');

    const result = await getSha512Combined(key, data);

    expect(result).toMatch(/^[a-f0-9]{128}$/);
    expect(result.length).toBe(128);
  });
});
