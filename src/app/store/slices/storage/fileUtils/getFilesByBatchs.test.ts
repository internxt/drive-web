import { describe, expect, it } from 'vitest';

import { DriveFileData, DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import { IRoot } from '../types';
import { getFilesByBatchs } from './getFilesByBatchs';

const getMockedArray = (length: number) => {
  return Array.from({ length }, (_, index) => ({
    id: `item${index + 1}`,
    name: `item${index + 1}`,
  })) as unknown as (DriveFileData | File)[] | (IRoot | DriveFolderData)[];
};

describe('getFilesByBatchs', () => {
  it('should divide items into batchs of a maximum size of 200', () => {
    const items = getMockedArray(450);
    const batchs = getFilesByBatchs(items);

    expect(batchs.length).toBe(3);
    expect(batchs[0].length).toBe(200);
    expect(batchs[1].length).toBe(200);
    expect(batchs[2].length).toBe(50);
  });

  it('should handle an array smaller than the slot size', () => {
    const items = getMockedArray(50);
    const batchs = getFilesByBatchs(items);

    expect(batchs.length).toBe(1);
    expect(batchs[0].length).toBe(50);
  });

  it('should return an empty array when no items are provided', () => {
    const items = [];
    const batchs = getFilesByBatchs(items);

    expect(batchs.length).toBe(0);
  });
});
