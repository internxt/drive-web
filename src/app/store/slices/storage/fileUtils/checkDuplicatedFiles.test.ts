import { beforeEach, describe, expect, test, vi } from 'vitest';
import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import newStorageService from 'app/drive/services/new-storage.service';

import { checkDuplicatedFiles } from './checkDuplicatedFiles';

describe('Check for duplicated files', () => {
  const parentFolderId = 'parent-folder-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When a file with extension already exists in the folder, then it should be detected as duplicated', async () => {
    const fileWithExtension = new File(['content'], 'document.pdf', { type: 'application/pdf' });
    const files = [fileWithExtension];

    vi.spyOn(newStorageService, 'checkDuplicatedFiles').mockResolvedValue({
      existentFiles: [{ plainName: 'document', type: 'pdf' }] as unknown as DriveFileData[],
    });

    const result = await checkDuplicatedFiles(files, parentFolderId);

    expect(result.filesWithDuplicates).toEqual([fileWithExtension]);
    expect(result.filesWithoutDuplicates).toEqual([]);
  });

  test('When a file without extension already exists in the folder, then it should be detected as duplicated', async () => {
    const fileWithoutExtension = new File(['content'], 'LICENSE', { type: '' });
    const files = [fileWithoutExtension];

    vi.spyOn(newStorageService, 'checkDuplicatedFiles').mockResolvedValue({
      existentFiles: [{ plainName: 'LICENSE', type: null }] as unknown as DriveFileData[],
    });

    const result = await checkDuplicatedFiles(files, parentFolderId);

    expect(result.filesWithDuplicates).toEqual([fileWithoutExtension]);
    expect(result.filesWithoutDuplicates).toEqual([]);
  });
});
