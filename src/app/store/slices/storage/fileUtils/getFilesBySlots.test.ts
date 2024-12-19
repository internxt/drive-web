import { describe, it, expect } from 'vitest';

import { getFilesBySlots } from './getFilesBySlots';
import { DriveFileData, DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import { IRoot } from '../types';

const getMockedArray = (length: number) => {
  return Array.from({ length }, (_, index) => ({
    id: `item${index + 1}`,
    name: `item${index + 1}`,
  })) as unknown as (DriveFileData | File)[] | (IRoot | DriveFolderData)[];
};

describe('getFilesBySlots', () => {
  it('should divide items into slots of a maximum size of 200', () => {
    const items = getMockedArray(450);
    const slots = getFilesBySlots(items);

    expect(slots.length).toBe(3);
    expect(slots[0].length).toBe(200);
    expect(slots[1].length).toBe(200);
    expect(slots[2].length).toBe(50);
  });

  it('should handle an array smaller than the slot size', () => {
    const items = getMockedArray(50);
    const slots = getFilesBySlots(items);

    expect(slots.length).toBe(1);
    expect(slots[0].length).toBe(50);
  });

  it('should return an empty array when no items are provided', () => {
    const items = [];
    const slots = getFilesBySlots(items);

    expect(slots.length).toBe(0);
  });
});
