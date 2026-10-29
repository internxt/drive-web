import { vi } from 'vitest';
import { UploadItemKind } from 'app/network/types';
import { UploadFileItem } from 'app/network/types/upload';
import { PersistUploadRepository } from 'app/repositories/DatabaseUploadRepository';
import { IRoot } from 'app/store/slices/storage/types';
import { TaskStatus } from 'app/tasks/types';

export const getFileToUpload = (name: string, size = 10): File => new File([new ArrayBuffer(size)], name);

export const getFolderToUpload = (name: string, content: Partial<IRoot> = {}): IRoot => ({
  name,
  folderId: null,
  isFolder: true,
  childrenFiles: [],
  childrenFolders: [],
  ...content,
});

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
  setUploadState: vi.fn(async () => undefined),
  removeUploadState: vi.fn(async () => undefined),
  getUploadState: vi.fn(async (key: string) => (pausedKeys.includes(key) ? TaskStatus.Paused : undefined)),
});
