import { describe, test, expect } from 'vitest';
import { v7 as uuidV7 } from 'uuid';
import { DriveItemData } from 'app/drive/types';
import { RootState } from '../..';
import storageSelectors from './storage.selectors';

const buildState = (selectedItems: Partial<DriveItemData>[]): RootState =>
  ({ storage: { selectedItems } }) as unknown as RootState;

describe('storage selectors', () => {
  describe('isItemSelected', () => {
    test('When the item is in the selection, then it is selected', () => {
      const item = { uuid: uuidV7(), isFolder: false } as DriveItemData;

      expect(storageSelectors.isItemSelected(buildState([item]))(item)).toBe(true);
    });

    test('When the item is not in the selection, then it is not selected', () => {
      const selected = { uuid: uuidV7(), isFolder: false } as DriveItemData;
      const other = { uuid: uuidV7(), isFolder: false } as DriveItemData;

      expect(storageSelectors.isItemSelected(buildState([selected]))(other)).toBe(false);
    });
  });
});
