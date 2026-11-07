import { PhotoDevice as SdkPhotoDevice } from '@internxt/sdk/dist/drive/photos';
import { FetchFolderFoldersCursorResponse } from '@internxt/sdk/dist/drive/storage/types';

type Folder = FetchFolderFoldersCursorResponse['folders'][number];

export const getSdkPhotoDevice = (overrides: Partial<SdkPhotoDevice> = {}): SdkPhotoDevice => ({
  uuid: 'iphone-uuid',
  plainName: 'iPhone',
  bucket: 'photos-bucket',
  status: 'EXISTS',
  ...overrides,
});

export const getPhotoFolder = (overrides: Partial<Folder> = {}): Folder =>
  ({
    type: 'folder',
    id: 1,
    parentId: 0,
    parentUuid: 'parent-uuid',
    name: 'encrypted-name',
    bucket: 'photos-bucket',
    userId: 1,
    encryptVersion: '03-aes',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    uuid: 'folder-uuid',
    plainName: 'folder',
    size: 0,
    creationTime: '2026-01-01T00:00:00.000Z',
    modificationTime: '2026-01-01T00:00:00.000Z',
    status: 'EXISTS',
    removed: false,
    deleted: false,
    ...overrides,
  }) as Folder;
