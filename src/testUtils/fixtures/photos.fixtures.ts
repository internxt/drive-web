import { PhotoDevice as SdkPhotoDevice, PhotoFolderFile } from '@internxt/sdk/dist/drive/photos';
import { FetchFolderFoldersCursorResponse } from '@internxt/sdk/dist/drive/storage/types';

type Folder = FetchFolderFoldersCursorResponse['folders'][number];
type PhotoFolderFileThumbnail = NonNullable<PhotoFolderFile['thumbnails']>[number];

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

export const getPhotoFolderFile = (overrides: Partial<PhotoFolderFile> = {}): PhotoFolderFile =>
  ({
    id: 1,
    uuid: 'file-uuid',
    fileId: 'network-file-id',
    name: 'encrypted-name',
    plainName: 'IMG_0001',
    type: 'jpg',
    size: '2048000',
    bucket: 'photos-bucket',
    folderId: 10,
    folderUuid: 'day-folder-uuid',
    encryptVersion: '03-aes',
    userId: 1,
    creationTime: '2026-11-03T09:30:00.000Z',
    modificationTime: '2026-11-03T09:30:00.000Z',
    createdAt: '2026-11-03T10:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
    status: 'EXISTS',
    thumbnails: [],
    ...overrides,
  }) as unknown as PhotoFolderFile;

export const getPhotoThumbnail = (overrides: Partial<PhotoFolderFileThumbnail> = {}): PhotoFolderFileThumbnail => ({
  id: 1,
  fileId: 0,
  fileUuid: 'file-uuid',
  maxWidth: 300,
  maxHeight: 300,
  type: 'jpg',
  size: 20000,
  bucketId: 'photos-bucket',
  bucketFile: 'thumbnail-bucket-file',
  encryptVersion: '03-aes',
  createdAt: '2026-11-03T10:00:00.000Z',
  updatedAt: '2026-11-03T10:00:00.000Z',
  ...overrides,
});
