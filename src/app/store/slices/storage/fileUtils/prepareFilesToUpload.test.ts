import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';

import newStorageService from '../../../../drive/services/new-storage.service';
import { checkDuplicatedFiles } from './checkDuplicatedFiles';
import { prepareFilesToUpload } from './prepareFilesToUpload';
import { processDuplicateFiles } from './processDuplicateFiles';
import { waitFor } from '@testing-library/dom';

vi.mock('../../../../drive/services/new-storage.service', () => ({
  default: {
    checkDuplicatedFiles: vi.fn(),
  },
}));

vi.mock('./checkDuplicatedFiles', async () => {
  const actual = await vi.importActual<typeof import('./checkDuplicatedFiles')>('./checkDuplicatedFiles');
  return {
    ...actual,
    checkDuplicatedFiles: vi.fn(actual.checkDuplicatedFiles),
  };
});

vi.mock('./processDuplicateFiles', async () => {
  const actual = await vi.importActual<typeof import('./processDuplicateFiles')>('./processDuplicateFiles');
  return {
    ...actual,
    processDuplicateFiles: vi.fn(actual.processDuplicateFiles),
  };
});

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
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    vi.restoreAllMocks();
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

    vi.mock('./checkDuplicatedFiles', { spy: true });
    vi.mock('./processDuplicateFiles', { spy: true });

    const result = await prepareFilesToUpload({ files: mockFiles, parentFolderId });

    await waitFor(() => {
      expect(checkDuplicatedFiles).toHaveBeenCalledTimes(4);
      expect(processDuplicateFiles).toHaveBeenCalledTimes(8);
      expect(result.zeroLengthFilesNumber).toBe(0);
      expect(result.filesToUpload.length).toBe(TOTAL_FILES);
    });
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

    vi.mock('./checkDuplicatedFiles', { spy: true });
    vi.mock('./processDuplicateFiles', { spy: true });

    const result = await prepareFilesToUpload({ files, parentFolderId });
    await waitFor(() => {
      expect(checkDuplicatedFiles).toHaveBeenCalledTimes(1);
      expect(processDuplicateFiles).toHaveBeenCalledTimes(2);
      expect(result.zeroLengthFilesNumber).toBe(1);
    });
  });

  it('should respect the disableDuplicatedNamesCheck flag', async () => {
    const files = [createMockFile('file.txt')];
    const parentFolderId = 'parent123';

    (checkDuplicatedFiles as Mock).mockResolvedValue({
      duplicatedFilesResponse: [{ name: 'file.txt' }],
      filesWithoutDuplicates: [],
      filesWithDuplicates: files,
    });

    vi.mock('./processDuplicateFiles', { spy: true });

    await prepareFilesToUpload({ files, parentFolderId, disableDuplicatedNamesCheck: true });

    await waitFor(() => {
      expect(processDuplicateFiles).toHaveBeenCalledWith(
        expect.objectContaining({
          disableDuplicatedNamesCheck: true,
        }),
      );
    });
  });

  it('should handle fileType parameter', async () => {
    const files = [createMockFile('file.txt')];
    const parentFolderId = 'parent123';
    const fileType = 'text/plain';

    (checkDuplicatedFiles as Mock).mockResolvedValue({
      duplicatedFilesResponse: [],
      filesWithoutDuplicates: files,
      filesWithDuplicates: [],
    });

    vi.mock('./processDuplicateFiles', { spy: true });

    await prepareFilesToUpload({ files, parentFolderId, fileType });

    await waitFor(() => {
      expect(processDuplicateFiles).toHaveBeenCalledWith(
        expect.objectContaining({
          fileType: 'text/plain',
        }),
      );
    });
  });
});
