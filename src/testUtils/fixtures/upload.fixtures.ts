import { vi } from 'vitest';
import { UploadFileItem, UploadItemKind } from 'app/upload/types';
import { PersistUploadRepository } from 'app/repositories/DatabaseUploadRepository';
import { IRoot } from 'app/store/slices/storage/types';
import { TaskStatus } from 'app/tasks/types';
import { UploadContext } from 'app/upload/uploadItems';
import { getDriveItemData } from './drive.fixtures';

export const MAX_UPLOAD_FILE_SIZE = 100;

export const getFileToUpload = (name: string, size = 10): File => new File([new ArrayBuffer(size)], name);

export const getFolderToUpload = (name: string, content: Partial<IRoot> = {}): IRoot => ({
  name,
  folderId: null,
  isFolder: true,
  childrenFiles: [],
  childrenFolders: [],
  ...content,
});

export const getFolderWithFiles = (name: string, fileNames: string[]): IRoot =>
  getFolderToUpload(name, { childrenFiles: fileNames.map((fileName) => getFileToUpload(fileName)) });

export const getUploadFileItem = (name: string, size = 1024): UploadFileItem => ({
  kind: UploadItemKind.File,
  file: { name, size, type: 'txt', content: getFileToUpload(name), parentFolderId: 'folder-uuid' },
});

export const getCreatedFolder = (name: string) => ({
  uuid: `${name}-uuid`,
  plainName: name,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const getUploadRepository = (pausedKeys: string[] = []): PersistUploadRepository => ({
  setUploadState: vi.fn(() => Promise.resolve()),
  removeUploadState: vi.fn(() => Promise.resolve()),
  getUploadState: vi.fn((key: string) => Promise.resolve(pausedKeys.includes(key) ? TaskStatus.Paused : undefined)),
});

export const getFolderCreationRequest = (response: Promise<unknown>) => [response, { cancel: vi.fn() }] as never;

export const getCreatedFolderRequest = (name: string) =>
  getFolderCreationRequest(Promise.resolve(getCreatedFolder(name)));

export const splitByExistingNames =
  (existingNames: string[]) =>
  async <T extends { name: string }>(items: T[]) => ({
    repeatedItems: items.filter(({ name }) => existingNames.includes(name)),
    existingItems: existingNames.map((name) => getDriveItemData({ name, uuid: `existing-${name}-uuid` })),
    unrepeatedItems: items.filter(({ name }) => !existingNames.includes(name)),
  });

export const getUploadContext = (overrides: Partial<UploadContext> = {}): UploadContext => ({
  uploadRepository: getUploadRepository(),
  maxUploadFileSize: MAX_UPLOAD_FILE_SIZE,
  planStorage: { limit: 0, usage: 0 },
  onUploadItemsLimitExceeded: vi.fn(),
  onFilesTooLarge: vi.fn(),
  onPlanLimitReached: vi.fn(),
  onNameCollisions: vi.fn(),
  onItemUploaded: vi.fn(),
  onItemRemoved: vi.fn(),
  onUploadFinished: vi.fn(),
  ...overrides,
});
