import { describe, it, expect, vi, afterAll } from 'vitest';
import { v7 as uuidV7 } from 'uuid';
import {
  canFileBeCached,
  deleteDatabaseItems,
  getDatabaseFilePreviewData,
  getDatabaseFileSourceData,
  getDatabasePhotoThumbnail,
  updateDatabaseFilePreviewData,
  updateDatabaseFileSourceData,
  updateDatabasePhotoThumbnail,
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

  describe('Photos thumbnails', () => {
    const thumbnail = (content: string) => new Blob([content], { type: 'image/jpeg' });

    it('When a photo thumbnail is saved, then it is kept apart from the Drive previews', async () => {
      const fileUuid = uuidV7();
      await updateDatabaseFilePreviewData({
        fileUuid,
        folderId: 1,
        previewBlob: thumbnail('drive'),
        updatedAt: 'v1',
      });

      await updateDatabasePhotoThumbnail({ fileUuid, previewBlob: thumbnail('photos'), updatedAt: 'v1' });

      await expect((await getDatabasePhotoThumbnail({ fileUuid }))?.preview.text()).resolves.toBe('photos');
      await expect((await getDatabaseFilePreviewData({ fileUuid }))?.preview?.text()).resolves.toBe('drive');
    });

    it('When a newer thumbnail of a photo is saved, then it replaces the outdated one', async () => {
      const fileUuid = uuidV7();
      await updateDatabasePhotoThumbnail({ fileUuid, previewBlob: thumbnail('old'), updatedAt: 'v1' });

      await updateDatabasePhotoThumbnail({ fileUuid, previewBlob: thumbnail('new'), updatedAt: 'v2' });

      const savedThumbnail = await getDatabasePhotoThumbnail({ fileUuid });
      expect(savedThumbnail?.updatedAt).toBe('v2');
      await expect(savedThumbnail?.preview.text()).resolves.toBe('new');
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
