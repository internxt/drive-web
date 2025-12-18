import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { processDuplicateFiles } from './processDuplicateFiles';
import { getUniqueFilename } from './getUniqueFilename';

vi.mock('./getUniqueFilename', () => ({
  getUniqueFilename: vi.fn(),
}));

const mockGetUniqueFilename = vi.mocked(getUniqueFilename);

describe('Process duplicated files', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When processing a single file without duplicates check, then it should add the file with original name', async () => {
    const file = new File(['content'], 'document.pdf', { type: 'application/pdf' });
    const parentFolderId = 'folder-123';

    const result = await processDuplicateFiles({
      files: [file],
      existingFilesToUpload: [],
      parentFolderId,
      disableDuplicatedNamesCheck: true,
    });

    expect(result.newFilesToUpload).toHaveLength(1);
    expect(result.newFilesToUpload[0].name).toBe('document');
    expect(result.newFilesToUpload[0].size).toBe(file.size);
    expect(result.newFilesToUpload[0].type).toBe('pdf');
    expect(result.newFilesToUpload[0].parentFolderId).toBe(parentFolderId);
    expect(result.newFilesToUpload[0].content.name).toBe('document');
    expect(mockGetUniqueFilename).not.toHaveBeenCalled();
  });

  test('When processing a file with duplicate check enabled and duplicates exist, then it should rename the file', async () => {
    const file = new File(['content'], 'report.txt', { type: 'text/plain' });
    const parentFolderId = 'folder-456';
    const duplicatedFiles = [{ plainName: 'report', type: 'txt' }] as DriveFileData[];

    mockGetUniqueFilename.mockResolvedValue('report (1)');

    const result = await processDuplicateFiles({
      files: [file],
      existingFilesToUpload: [],
      parentFolderId,
      disableDuplicatedNamesCheck: false,
      duplicatedFiles,
    });

    expect(result.newFilesToUpload).toHaveLength(1);
    expect(result.newFilesToUpload[0].name).toBe('report (1)');
    expect(result.newFilesToUpload[0].content.name).toBe('report (1)');
    expect(mockGetUniqueFilename).toHaveBeenCalledWith('report', 'txt', duplicatedFiles, parentFolderId);
  });

  test('When a file has no extension, then it should use the provided file type', async () => {
    const file = new File(['content'], 'README', { type: 'text/plain' });
    const parentFolderId = 'folder-222';
    const fileType = 'txt';

    const result = await processDuplicateFiles({
      files: [file],
      existingFilesToUpload: [],
      fileType,
      parentFolderId,
      disableDuplicatedNamesCheck: true,
    });

    expect(result.newFilesToUpload).toHaveLength(1);
    expect(result.newFilesToUpload[0].name).toBe('README');
    expect(result.newFilesToUpload[0].type).toBe(fileType);
  });

  test('When there are no duplicated files and the check is disabled, then it should not get a unique filename', async () => {
    const file = new File(['content'], 'test.js', { type: 'application/javascript' });
    const parentFolderId = 'folder-333';

    const result = await processDuplicateFiles({
      files: [file],
      existingFilesToUpload: [],
      parentFolderId,
      disableDuplicatedNamesCheck: false,
      duplicatedFiles: undefined,
    });

    expect(result.newFilesToUpload).toHaveLength(1);
    expect(result.newFilesToUpload[0].name).toBe('test');
    expect(result.newFilesToUpload[0].type).toBe('js');
    expect(mockGetUniqueFilename).not.toHaveBeenCalled();
  });

  test('When processing files with duplicate check, then it should use an unique filename', async () => {
    const file = new File(['content'], 'data.csv', { type: 'text/csv' });
    const uniqueName = 'data (3)';
    const parentFolderId = 'folder-555';
    const duplicatedFiles = [
      { plainName: 'data', type: 'csv' },
      { plainName: 'data (1)', type: 'csv' },
      { plainName: 'data (2)', type: 'csv' },
    ] as DriveFileData[];

    mockGetUniqueFilename.mockResolvedValue(uniqueName);

    const result = await processDuplicateFiles({
      files: [file],
      existingFilesToUpload: [],
      parentFolderId,
      disableDuplicatedNamesCheck: false,
      duplicatedFiles,
    });

    expect(result.newFilesToUpload[0].name).toBe(uniqueName);
    expect(result.newFilesToUpload[0].content.name).toBe(uniqueName);
  });

  test('When processing files with different extensions but same name, then each should be processed independently', async () => {
    const fileTxt = new File(['text'], 'readme.txt', { type: 'text/plain' });
    const fileMd = new File(['markdown'], 'readme.md', { type: 'text/markdown' });
    const parentFolderId = 'folder-777';

    const result = await processDuplicateFiles({
      files: [fileTxt, fileMd],
      existingFilesToUpload: [],
      parentFolderId,
      disableDuplicatedNamesCheck: true,
    });

    expect(result.newFilesToUpload).toHaveLength(2);
    const types = result.newFilesToUpload.map((f) => f.type);
    expect(types).toContain('txt');
    expect(types).toContain('md');
  });
});
