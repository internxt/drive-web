import { SdkFactory } from 'app/core/factory/sdk';
import { getPhotoFolder } from 'testUtils/fixtures/photos.fixtures';
import { beforeEach, describe, expect, Mock, test, vi } from 'vitest';
import { PhotoFoldersService } from './photoFolders.service';

vi.mock('app/core/factory/sdk', () => ({
  SdkFactory: { getNewApiInstance: vi.fn() },
}));

describe('Photo backup folders', () => {
  const storageClient = { getFolderFoldersByUuidWithCursor: vi.fn() };

  const givenSubfolders = (subfoldersByFolder: Record<string, ReturnType<typeof getPhotoFolder>[]>) => {
    storageClient.getFolderFoldersByUuidWithCursor.mockImplementation((folderUuid: string) => [
      Promise.resolve({ folders: subfoldersByFolder[folderUuid] ?? [], nextCursor: null }),
      { cancel: vi.fn() },
    ]);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({ createNewStorageClient: () => storageClient });
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
});
