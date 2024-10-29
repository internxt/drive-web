import { beforeEach, describe, expect, it, vi, Mock } from 'vitest';

import newStorageService from '../../../../drive/services/new-storage.service';
import * as checkDuplicatedFilesModule from './checkDuplicatedFiles';
import { prepareFilesToUpload } from './prepareFilesToUpload';
import * as processDuplicateFilesModule from './processDuplicateFiles';

vi.mock('../../../../drive/services/new-storage.service', () => ({
  default: {
    checkDuplicatedFiles: vi.fn(),
  },
}));

function createMockFile(name: string, size = 0, type = ''): File {
  return {
    name,
    size,
    type,
    slice: vi.fn(),
  } as unknown as File;
}

describe('prepareFilesToUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process files in batches', async () => {
    const TOTAL_FILES = 800;
    const mockFiles = Array(TOTAL_FILES)
      .fill(null)
      .map((_, i) => createMockFile(`file${i}.txt`, 13, 'text/plain'));
    const parentFolderId = 'parent123';

    (newStorageService.checkDuplicatedFiles as Mock).mockResolvedValue({
      existentFiles: [],
    });

    const checkDuplicatedFilesSpy = vi.spyOn(checkDuplicatedFilesModule, 'checkDuplicatedFiles');
    const processDuplicateFilesSpy = vi.spyOn(processDuplicateFilesModule, 'processDuplicateFiles');

    const result = await prepareFilesToUpload({ files: mockFiles, parentFolderId });

    expect(checkDuplicatedFilesSpy).toHaveBeenCalledTimes(4);
    expect(processDuplicateFilesSpy).toHaveBeenCalledTimes(8);
    expect(result.zeroLengthFilesNumber).toBe(0);
    expect(result.filesToUpload.length).toBe(TOTAL_FILES);
  });

  it('should handle duplicates and non-duplicates', async () => {
    const files = Array(10)
      .fill(null)
      .map((_, i) => createMockFile(`file${i}.txt`, i === 0 ? 0 : 1, 'text/plain'));
    const parentFolderId = 'parent123';

    (newStorageService.checkDuplicatedFiles as Mock)
      .mockResolvedValueOnce({
        existentFiles: [{ plainName: 'file2', type: 'txt' }],
      })
      .mockResolvedValueOnce({ existentFiles: [] });

    const checkDuplicatedFilesSpy = vi.spyOn(checkDuplicatedFilesModule, 'checkDuplicatedFiles');
    const processDuplicateFilesSpy = vi.spyOn(processDuplicateFilesModule, 'processDuplicateFiles');

    const result = await prepareFilesToUpload({ files, parentFolderId });

    expect(checkDuplicatedFilesSpy).toHaveBeenCalledTimes(1);
    expect(processDuplicateFilesSpy).toHaveBeenCalledTimes(2);
    expect(result.zeroLengthFilesNumber).toBe(1);
  });

  it('should respect the disableDuplicatedNamesCheck flag', async () => {
    const files = [createMockFile('file.txt')];
    const parentFolderId = 'parent123';

    (checkDuplicatedFilesModule.checkDuplicatedFiles as Mock).mockResolvedValue({
      duplicatedFilesResponse: [{ name: 'file.txt' }],
      filesWithoutDuplicates: [],
      filesWithDuplicates: files,
    });

    const processDuplicateFilesSpy = vi.spyOn(processDuplicateFilesModule, 'processDuplicateFiles');

    await prepareFilesToUpload({ files, parentFolderId, disableDuplicatedNamesCheck: true });

    expect(processDuplicateFilesSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        disableDuplicatedNamesCheck: true,
      }),
    );
  });

  it('should handle fileType parameter', async () => {
    const files = [createMockFile('file.txt')];
    const parentFolderId = 'parent123';
    const fileType = 'text/plain';

    (checkDuplicatedFilesModule.checkDuplicatedFiles as Mock).mockResolvedValue({
      duplicatedFilesResponse: [],
      filesWithoutDuplicates: files,
      filesWithDuplicates: [],
    });

    const processDuplicateFilesSpy = vi.spyOn(processDuplicateFilesModule, 'processDuplicateFiles');

    await prepareFilesToUpload({ files, parentFolderId, fileType });

    expect(processDuplicateFilesSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        fileType: 'text/plain',
      }),
    );
  });
});
