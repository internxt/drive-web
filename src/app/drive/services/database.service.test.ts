import { describe, it, expect } from 'vitest';
import { canFileBeCached } from './database.service';
import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';

describe('databaseService', () => {
  describe('canFileBeCached', () => {
    it('should return true when file size is less than 50MB', () => {
      const file = { size: 1024 * 1024 * 25 } as DriveFileData;
      expect(canFileBeCached(file)).toBe(true);
    });

    it('should return false when file size is greater than 50MB', () => {
      const file = { size: 1024 * 1024 * 51 } as DriveFileData;
      expect(canFileBeCached(file)).toBe(false);
    });

    it('should return true when file size is exactly 50MB', () => {
      const file = { size: 1024 * 1024 * 50 } as DriveFileData;
      expect(canFileBeCached(file)).toBe(false);
    });
  });
});
