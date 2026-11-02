import { vi } from 'vitest';
import { UploadFileItem, UploadItemKind } from 'app/upload/types';
import { PersistUploadRepository } from 'app/repositories/DatabaseUploadRepository';
import { TaskStatus } from 'app/tasks/types';

export const getFileToUpload = (name: string, size = 10): File => new File([new ArrayBuffer(size)], name);

export const getUploadFileItem = (name: string, size = 1024): UploadFileItem => ({
  kind: UploadItemKind.File,
  file: { name, size, type: 'txt', content: getFileToUpload(name), parentFolderId: 'folder-uuid' },
});

export const getUploadRepository = (pausedKeys: string[] = []): PersistUploadRepository => ({
  setUploadState: vi.fn(() => Promise.resolve()),
  removeUploadState: vi.fn(() => Promise.resolve()),
  getUploadState: vi.fn((key: string) => Promise.resolve(pausedKeys.includes(key) ? TaskStatus.Paused : undefined)),
});
