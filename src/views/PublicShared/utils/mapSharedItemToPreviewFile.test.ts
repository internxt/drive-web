import { describe, expect, test } from 'vitest';
import { AdvancedSharedItem } from 'app/share/types';
import mapSharedItemToPreviewFile from './mapSharedItemToPreviewFile';

const createSharedItem = (overrides: Partial<AdvancedSharedItem> = {}): AdvancedSharedItem =>
  ({
    id: 7,
    uuid: 'file-uuid',
    bucket: 'bucket-id',
    fileId: 'network-file-id',
    name: 'encrypted-name',
    plainName: 'report',
    type: 'pdf',
    size: '2048',
    folderId: 3,
    folderUuid: 'folder-uuid',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-02T00:00:00.000Z',
    deleted: false,
    encryptVersion: '03-aes',
    status: 'EXISTS',
    thumbnails: [],
    isFolder: false,
    ...overrides,
  }) as AdvancedSharedItem;

describe('mapSharedItemToPreviewFile', () => {
  test('When a shared item is mapped, then the preview file keeps its identity and converts size to a number', () => {
    const previewFile = mapSharedItemToPreviewFile(createSharedItem());

    expect(previewFile).toMatchObject({
      id: 7,
      uuid: 'file-uuid',
      bucket: 'bucket-id',
      fileId: 'network-file-id',
      name: 'encrypted-name',
      plainName: 'report',
      plain_name: 'report',
      type: 'pdf',
      size: 2048,
      folderId: 3,
      folder_id: 3,
      folderUuid: 'folder-uuid',
      createdAt: '2026-07-01T00:00:00.000Z',
      created_at: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-02T00:00:00.000Z',
      deletedAt: null,
      encrypt_version: '03-aes',
      status: 'EXISTS',
      thumbnails: [],
      currentThumbnail: null,
    });
  });

  test('When the shared item has no bucket or network file id, then the preview file uses safe fallbacks', () => {
    const previewFile = mapSharedItemToPreviewFile(createSharedItem({ bucket: null, fileId: undefined }));

    expect(previewFile.bucket).toBe('');
    expect(previewFile.fileId).toBeNull();
  });
});
