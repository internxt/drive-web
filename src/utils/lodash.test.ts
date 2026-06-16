import { describe, expect, it } from 'vitest';
import _, { uniqueId } from './lodash';

describe('uniqueId', () => {
  it('returns a non-empty string', () => {
    expect(uniqueId()).toBeTruthy();
  });

  it('prepends the given prefix', () => {
    const id = uniqueId('task-');
    expect(id.startsWith('task-')).toBe(true);
  });

  it('generates unique values on each call', () => {
    const ids = Array.from({ length: 100 }, () => uniqueId());
    const unique = new Set(ids);
    expect(unique.size).toBe(100);
  });
});

describe('_.concat', () => {
  it('concatenates two arrays', () => {
    expect(_.concat([1, 2], [3, 4])).toEqual([1, 2, 3, 4]);
  });

  it('concatenates three arrays', () => {
    expect(_.concat([1], [2], [3])).toEqual([1, 2, 3]);
  });

  it('returns empty array when all inputs are empty', () => {
    expect(_.concat([], [])).toEqual([]);
  });
});

describe('_.chunk', () => {
  it('splits array into chunks of given size', () => {
    expect(_.chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
  });

  it('last chunk is smaller if array length is not divisible', () => {
    expect(_.chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('returns empty array for empty input', () => {
    expect(_.chunk([], 3)).toEqual([]);
  });

  it('returns one chunk when size exceeds array length', () => {
    expect(_.chunk([1, 2], 10)).toEqual([[1, 2]]);
  });
});

describe('_.sample', () => {
  it('returns an element from the array', () => {
    const arr = [1, 2, 3, 4, 5];
    const result = _.sample(arr);
    expect(arr).toContain(result);
  });

  it('returns undefined for an empty array', () => {
    expect(_.sample([])).toBeUndefined();
  });

  it('always returns the only element of a single-element array', () => {
    expect(_.sample([42])).toBe(42);
  });
});
