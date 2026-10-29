import { vi } from 'vitest';
import { UploadItemKind } from 'app/network/types';
import { UploadFileItem } from 'app/network/types/upload';
import { PersistUploadRepository } from 'app/repositories/DatabaseUploadRepository';
import { TaskStatus } from 'app/tasks/types';

export const getFileToUpload = (name: string, size = 10): File => new File([new ArrayBuffer(size)], name);

export const getUploadFileItem = (name: string, size = 1024): UploadFileItem => ({
  kind: UploadItemKind.File,
  file: { name, size, type: 'txt', content: getFileToUpload(name), parentFolderId: 'folder-uuid' },
});

export const getUploadRepository = (pausedKeys: string[] = []): PersistUploadRepository => ({
  setUploadState: vi.fn(async () => undefined),
  removeUploadState: vi.fn(async () => undefined),
  getUploadState: vi.fn(async (key: string) => (pausedKeys.includes(key) ? TaskStatus.Paused : undefined)),
});
