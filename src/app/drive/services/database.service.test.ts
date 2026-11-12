import { describe, it, expect } from 'vitest';
import {
  canFileBeCached,
  getDatabaseFilePreviewData,
  getDatabasePhotoThumbnail,
  updateDatabaseFilePreviewData,
  updateDatabasePhotoThumbnail,
} from './database.service';
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

  describe('Photos thumbnails', () => {
    const thumbnail = (content: string) => new Blob([content], { type: 'image/jpeg' });

    it('When a photo thumbnail is saved, then it is kept apart from the Drive previews', async () => {
      await updateDatabaseFilePreviewData({
        fileId: 101,
        folderId: 1,
        previewBlob: thumbnail('drive'),
        updatedAt: 'v1',
      });

      await updateDatabasePhotoThumbnail({ fileId: 101, previewBlob: thumbnail('photos'), updatedAt: 'v1' });

      await expect((await getDatabasePhotoThumbnail({ fileId: 101 }))?.preview.text()).resolves.toBe('photos');
      await expect((await getDatabaseFilePreviewData({ fileId: 101 }))?.preview?.text()).resolves.toBe('drive');
    });

    it('When a newer thumbnail of a photo is saved, then it replaces the outdated one', async () => {
      await updateDatabasePhotoThumbnail({ fileId: 102, previewBlob: thumbnail('old'), updatedAt: 'v1' });

      await updateDatabasePhotoThumbnail({ fileId: 102, previewBlob: thumbnail('new'), updatedAt: 'v2' });

      const savedThumbnail = await getDatabasePhotoThumbnail({ fileId: 102 });
      expect(savedThumbnail?.updatedAt).toBe('v2');
      await expect(savedThumbnail?.preview.text()).resolves.toBe('new');
    });
  });
});
