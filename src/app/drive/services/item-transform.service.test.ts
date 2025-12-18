import { describe, expect, test } from 'vitest';
import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import transformItemService from './item-transform.service';

const createMockFile = (overrides: Partial<DriveFileData> = {}): DriveFileData =>
  ({
    id: 1,
    uuid: 'test-uuid',
    name: 'test-file',
    plainName: 'test-file',
    plain_name: 'test-file',
    type: 'txt',
    size: 1024,
    bucket: 'test-bucket',
    folderId: 1,
    folder_id: 1,
    folderUuid: 'folder-uuid',
    fileId: 'file-id',
    createdAt: '2024-01-01',
    created_at: '2024-01-01',
    updatedAt: '2024-01-01',
    deleted: false,
    deletedAt: null,
    encrypt_version: '1',
    status: 'EXISTS',
    thumbnails: [],
    currentThumbnail: null,
    ...overrides,
  }) as DriveFileData;

describe('Item Transform Service', () => {
  describe('Map Files to Drive File Data', () => {
    test('When the file size is a string, then should convert it to number', () => {
      const files = [createMockFile({ size: '12345' as unknown as number })];

      const result = transformItemService.mapFileSizeToNumber(files);

      expect(result[0].size).toBe(12345);
      expect(typeof result[0].size).toBe('number');
    });

    test('When converting the file size, then should preserve all other file properties', () => {
      const originalFile = createMockFile({
        id: 42,
        uuid: 'unique-uuid',
        plainName: 'my-file',
        type: 'pdf',
        size: '5000' as unknown as number,
      });

      const result = transformItemService.mapFileSizeToNumber([originalFile]);

      expect(result[0].id).toBe(42);
      expect(result[0].uuid).toBe('unique-uuid');
      expect(result[0].plainName).toBe('my-file');
      expect(result[0].type).toBe('pdf');
      expect(result[0].size).toBe(5000);
    });

    test('When the file size is already a number, then should keep it as number', () => {
      const files = [createMockFile({ size: 9876 })];

      const result = transformItemService.mapFileSizeToNumber(files);

      expect(result[0].size).toBe(9876);
      expect(typeof result[0].size).toBe('number');
    });

    test('When there are multiple files, then should handle them correctly', () => {
      const files = [
        createMockFile({ size: '100' as unknown as number }),
        createMockFile({ size: 200 }),
        createMockFile({ size: '300' as unknown as number }),
      ];

      const result = transformItemService.mapFileSizeToNumber(files);

      expect(result[0].size).toBe(100);
      expect(result[1].size).toBe(200);
      expect(result[2].size).toBe(300);
      result.forEach((file) => expect(typeof file.size).toBe('number'));
    });
  });
});
