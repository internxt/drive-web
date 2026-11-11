import { getPhotoFolder, getPhotoFolderFile } from 'testUtils/fixtures/photos.fixtures';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PhotoFoldersService } from './photoFolders.service';
import { mockSdkFactory } from 'testUtils/sdk.mock';

vi.mock('app/core/factory/sdk', () => ({
  SdkFactory: { getNewApiInstance: vi.fn() },
}));

describe('Photo backup folders', () => {
  const storageClient = { getFolderFoldersByUuidWithCursor: vi.fn() };
  const photosClient = { getFilesInFolders: vi.fn() };

  const givenSubfolders = (subfoldersByFolder: Record<string, ReturnType<typeof getPhotoFolder>[]>) => {
    storageClient.getFolderFoldersByUuidWithCursor.mockImplementation((folderUuid: string) => [
      Promise.resolve({ folders: subfoldersByFolder[folderUuid] ?? [], nextCursor: null }),
      { cancel: vi.fn() },
    ]);
  };

  beforeEach(() => {
    mockSdkFactory({
      createNewStorageClient: storageClient,
      createPhotosClient: photosClient,
    });
  });

  test('When a device has photos in several years, then its months are returned newest first', async () => {
    givenSubfolders({
      iphone: [
        getPhotoFolder({ uuid: 'year-2025', plainName: '2025' }),
        getPhotoFolder({ uuid: 'year-2026', plainName: '2026' }),
      ],
      'year-2025': [getPhotoFolder({ uuid: 'december-2025', plainName: '12' })],
      'year-2026': [
        getPhotoFolder({ uuid: 'january-2026', plainName: '1' }),
        getPhotoFolder({ uuid: 'november-2026', plainName: '11' }),
      ],
    });

    const months = await PhotoFoldersService.instance.getDeviceMonths('iphone');

    expect(months).toStrictEqual([
      { key: '2026-11', deviceUuid: 'iphone', folderUuid: 'november-2026' },
      { key: '2026-01', deviceUuid: 'iphone', folderUuid: 'january-2026' },
      { key: '2025-12', deviceUuid: 'iphone', folderUuid: 'december-2025' },
    ]);
  });

  test('When a device has folders that are not a year or a month, then they are ignored', async () => {
    givenSubfolders({
      iphone: [
        getPhotoFolder({ uuid: 'sync', plainName: '.sync' }),
        getPhotoFolder({ uuid: 'year-2026', plainName: '2026' }),
      ],
      'year-2026': [
        getPhotoFolder({ uuid: 'november-2026', plainName: '11' }),
        getPhotoFolder({ uuid: 'not-a-month', plainName: '13' }),
        getPhotoFolder({ uuid: 'misc', plainName: 'misc' }),
      ],
    });

    const months = await PhotoFoldersService.instance.getDeviceMonths('iphone');

    expect(months).toStrictEqual([{ key: '2026-11', deviceUuid: 'iphone', folderUuid: 'november-2026' }]);
    expect(storageClient.getFolderFoldersByUuidWithCursor).not.toHaveBeenCalledWith('sync', expect.anything());
  });

  test('When the folders come in several pages, then the months of every page are returned', async () => {
    storageClient.getFolderFoldersByUuidWithCursor.mockImplementation(
      (folderUuid: string, { cursor }: { cursor?: string }) => {
        const pages: Record<string, { folders: ReturnType<typeof getPhotoFolder>[]; nextCursor: string | null }> = {
          iphone: { folders: [getPhotoFolder({ uuid: 'year-2026', plainName: '2026' })], nextCursor: null },
          'year-2026': cursor
            ? { folders: [getPhotoFolder({ uuid: 'january-2026', plainName: '01' })], nextCursor: null }
            : { folders: [getPhotoFolder({ uuid: 'february-2026', plainName: '02' })], nextCursor: 'next-page' },
        };
        return [Promise.resolve(pages[folderUuid]), { cancel: vi.fn() }];
      },
    );

    const months = await PhotoFoldersService.instance.getDeviceMonths('iphone');

    expect(months.map((month) => month.key)).toStrictEqual(['2026-02', '2026-01']);
  });

  describe('Getting the photos of a month', () => {
    const november2026 = { key: '2026-11' as const, deviceUuid: 'iphone', folderUuid: 'november-2026' };

    test('When a month has photos in several days, then each photo comes with the day of its folder', async () => {
      givenSubfolders({
        'november-2026': [
          getPhotoFolder({ uuid: 'day-2', plainName: '2' }),
          getPhotoFolder({ uuid: 'day-15', plainName: '15' }),
        ],
      });
      photosClient.getFilesInFolders.mockResolvedValue({
        files: [
          getPhotoFolderFile({
            uuid: 'photo-a',
            plainName: 'IMG_A',
            type: 'heic',
            folderUuid: 'day-2',
            creationTime: '2026-11-02T09:00:00Z',
          }),
          getPhotoFolderFile({
            uuid: 'photo-b',
            plainName: 'IMG_B',
            type: 'jpg',
            folderUuid: 'day-15',
            creationTime: '2026-11-15T09:00:00Z',
          }),
        ],
        nextCursor: null,
      });

      const photos = await PhotoFoldersService.instance.getMonthPhotos(november2026);

      expect(photos).toStrictEqual([
        {
          uuid: 'photo-a',
          name: 'IMG_A.heic',
          type: 'heic',
          day: '2026-11-02',
          takenAt: '2026-11-02T09:00:00Z',
        },
        {
          uuid: 'photo-b',
          name: 'IMG_B.jpg',
          type: 'jpg',
          day: '2026-11-15',
          takenAt: '2026-11-15T09:00:00Z',
        },
      ]);
      expect(photosClient.getFilesInFolders).toHaveBeenCalledWith({
        folderUuids: ['day-2', 'day-15'],
        updatedAt: new Date(0).toISOString(),
        limit: 200,
      });
    });

    test('When a month has folders that are not a day, then their photos are not requested', async () => {
      givenSubfolders({
        'november-2026': [
          getPhotoFolder({ uuid: 'day-2', plainName: '2' }),
          getPhotoFolder({ uuid: 'not-a-day', plainName: '32' }),
          getPhotoFolder({ uuid: 'misc', plainName: 'misc' }),
        ],
      });
      photosClient.getFilesInFolders.mockResolvedValue({ files: [], nextCursor: null });

      await PhotoFoldersService.instance.getMonthPhotos(november2026);

      expect(photosClient.getFilesInFolders).toHaveBeenCalledWith(expect.objectContaining({ folderUuids: ['day-2'] }));
    });

    test('When some photos are trashed or deleted, then they are left out', async () => {
      givenSubfolders({ 'november-2026': [getPhotoFolder({ uuid: 'day-2', plainName: '2' })] });
      photosClient.getFilesInFolders.mockResolvedValue({
        files: [
          getPhotoFolderFile({ uuid: 'existing', folderUuid: 'day-2' }),
          getPhotoFolderFile({ uuid: 'trashed', folderUuid: 'day-2', status: 'TRASHED' }),
          getPhotoFolderFile({ uuid: 'deleted', folderUuid: 'day-2', status: 'DELETED' }),
        ],
        nextCursor: null,
      });

      const photos = await PhotoFoldersService.instance.getMonthPhotos(november2026);

      expect(photos.map((photo) => photo.uuid)).toStrictEqual(['existing']);
    });

    test('When a photo belongs to a folder that is not a day of the month, then it is left out', async () => {
      givenSubfolders({ 'november-2026': [getPhotoFolder({ uuid: 'day-2', plainName: '2' })] });
      photosClient.getFilesInFolders.mockResolvedValue({
        files: [
          getPhotoFolderFile({ uuid: 'in-day', folderUuid: 'day-2' }),
          getPhotoFolderFile({ uuid: 'elsewhere', folderUuid: 'unknown-folder' }),
        ],
        nextCursor: null,
      });

      const photos = await PhotoFoldersService.instance.getMonthPhotos(november2026);

      expect(photos.map((photo) => photo.uuid)).toStrictEqual(['in-day']);
    });

    test('When the photos come in several pages, then every page is requested with the cursor of the previous one', async () => {
      givenSubfolders({ 'november-2026': [getPhotoFolder({ uuid: 'day-2', plainName: '2' })] });
      photosClient.getFilesInFolders
        .mockResolvedValueOnce({
          files: [getPhotoFolderFile({ uuid: 'first', folderUuid: 'day-2' })],
          nextCursor: 'next-page',
        })
        .mockResolvedValueOnce({
          files: [getPhotoFolderFile({ uuid: 'second', folderUuid: 'day-2' })],
          nextCursor: null,
        });

      const photos = await PhotoFoldersService.instance.getMonthPhotos(november2026);

      expect(photos.map((photo) => photo.uuid)).toStrictEqual(['first', 'second']);
      expect(photosClient.getFilesInFolders).toHaveBeenLastCalledWith({
        folderUuids: ['day-2'],
        cursor: 'next-page',
        limit: 200,
      });
    });

    test('When a month has no day folders, then no photos are requested', async () => {
      givenSubfolders({ 'november-2026': [] });

      const photos = await PhotoFoldersService.instance.getMonthPhotos(november2026);

      expect(photos).toStrictEqual([]);
      expect(photosClient.getFilesInFolders).not.toHaveBeenCalled();
    });
  });
});
