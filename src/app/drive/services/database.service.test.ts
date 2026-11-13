import { describe, it, expect, vi, afterAll } from 'vitest';
import { v7 as uuidV7 } from 'uuid';
import {
  canFileBeCached,
  deleteDatabaseItems,
  getDatabaseFilePreviewData,
  getDatabaseFileSourceData,
  updateDatabaseFilePreviewData,
  updateDatabaseFileSourceData,
} from './database.service';
import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import { DriveItemData } from '../types';
import databaseService from 'app/database/services/database.service';

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

  describe('File blobs cache', () => {
    afterAll(() => databaseService.clear());

    it('when files have no id, then their source, preview and deletion are resolved by uuid', async () => {
      const fileA = { uuid: uuidV7(), size: 3 };
      const fileB = { uuid: uuidV7(), size: 3 };

      await updateDatabaseFileSourceData({
        fileUuid: fileA.uuid,
        folderId: 1,
        sourceBlob: new Blob(['aaa']),
        updatedAt: '',
      });
      await updateDatabaseFileSourceData({
        fileUuid: fileB.uuid,
        folderId: 1,
        sourceBlob: new Blob(['bbb']),
        updatedAt: '',
      });
      await updateDatabaseFilePreviewData({
        fileUuid: fileA.uuid,
        folderId: 1,
        previewBlob: new Blob(['pa']),
        updatedAt: '',
      });

      expect(await (await getDatabaseFileSourceData({ fileUuid: fileA.uuid }))?.source?.text()).toBe('aaa');
      expect(await (await getDatabaseFileSourceData({ fileUuid: fileB.uuid }))?.source?.text()).toBe('bbb');
      expect(await (await getDatabaseFilePreviewData({ fileUuid: fileA.uuid }))?.preview?.text()).toBe('pa');
      expect(await getDatabaseFilePreviewData({ fileUuid: fileB.uuid })).toBeUndefined();

      await deleteDatabaseItems([fileA as unknown as DriveItemData]);

      await vi.waitFor(async () => {
        expect(await getDatabaseFileSourceData({ fileUuid: fileA.uuid })).toBeUndefined();
      });
      expect(await (await getDatabaseFileSourceData({ fileUuid: fileB.uuid }))?.source?.text()).toBe('bbb');
      expect(await (await getDatabaseFilePreviewData({ fileUuid: fileA.uuid }))?.preview?.text()).toBe('pa');
    });
  });
});
