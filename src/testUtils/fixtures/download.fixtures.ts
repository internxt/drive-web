import { vi } from 'vitest';
import { EncryptionVersion, FileStatus } from '@internxt/sdk/dist/drive/storage/types';
import { DownloadItem, DownloadTask } from 'app/drive/services/downloadManager.service';
import { DriveFileData, DriveFolderData, DriveItemData } from 'app/drive/types';

export const getDriveFileData = (overrides: Partial<DriveFileData> = {}): DriveFileData => ({
  id: 0,
  uuid: 'uuid',
  bucket: 'bucket',
  name: 'File1',
  plainName: 'File1',
  plain_name: 'File1',
  type: 'jpg',
  size: 100,
  fileId: 'fileId1',
  folder_id: 1,
  folderId: 1,
  folderUuid: 'uuid1',
  createdAt: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  deleted: false,
  deletedAt: null,
  currentThumbnail: null,
  encrypt_version: EncryptionVersion.Aes03,
  status: FileStatus.EXISTS,
  thumbnails: [],
  ...overrides,
});

export const getDriveFolderData = (overrides: Partial<DriveFolderData> = {}): DriveFolderData => ({
  id: 0,
  uuid: 'uuid',
  name: 'Folder1',
  bucket: 'bucket',
  parentId: 0,
  parent_id: 0,
  parentUuid: 'parentUuid',
  userId: 0,
  user_id: 0,
  icon: null,
  iconId: null,
  icon_id: null,
  isFolder: true,
  color: null,
  encrypt_version: null,
  plain_name: 'Folder1',
  deleted: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const getDownloadItem = (payload: Array<DriveFileData | DriveFolderData>): DownloadItem => ({
  payload: payload as DriveItemData[],
  selectedWorkspace: null,
  workspaceCredentials: null,
});

export const getDownloadTask = (
  items: Array<DriveFileData | DriveFolderData>,
  overrides: Partial<DownloadTask> = {},
): DownloadTask => ({
  items: items as DriveItemData[],
  credentials: {
    credentials: { user: 'any-user', pass: 'any-pass' },
    key: { mnemonic: 'any-mnemonic' },
  },
  taskId: 'any-taskId',
  createFilesIterator: vi.fn(),
  createFoldersIterator: vi.fn(),
  options: { areSharedItems: false, downloadName: items[0].name, showErrors: true },
  failedItems: [],
  ...overrides,
});
