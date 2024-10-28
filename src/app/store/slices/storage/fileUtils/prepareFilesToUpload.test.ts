import { beforeEach, describe, expect, it, vi, Mock } from 'vitest';

import newStorageService from '../../../../drive/services/new-storage.service';
import * as checkDuplicatedFilesModule from './checkDuplicatedFiles';
import { prepareFilesToUpload } from './prepareFilesToUpload';
import * as processDuplicateFilesModule from './processDuplicateFiles';


vi.mock('../../../../drive/services/new-storage.service', () => ({
  checkDuplicatedFiles: vi.fn(),
}));

// MOCK FILE NECESSARY BECAUSE IN NODE, THE CLASS FILE NOT EXISTS
class MockFile {
  name: string;
  size: number;
  type: string;

  constructor(parts: [], filename: string, properties?: { type?: string; size?: number }) {
    this.name = filename;
    this.size = properties?.size || 0;
    this.type = properties?.type || '';
  }
}

global.File = MockFile as any;

describe('prepareFilesToUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process files in batches', async () => {
    const TOTAL_FILES = 800;
    const mockFiles = Array(TOTAL_FILES)
      .fill(null)
      .map((_, i) => new MockFile([], `file${i}.txt`, { type: 'text/plain', size: 13 }));
    const parentFolderId = 'parent123';
    (newStorageService.checkDuplicatedFiles as Mock).mockResolvedValue({
      existentFiles: [],
    });

    const checkDuplicatedFilesSpy = vi.spyOn(checkDuplicatedFilesModule, 'checkDuplicatedFiles');
    const processDuplicateFiles = vi.spyOn(processDuplicateFilesModule, 'processDuplicateFiles');
    const result = await prepareFilesToUpload({ files: mockFiles as File[], parentFolderId });

    expect(checkDuplicatedFilesSpy).toHaveBeenCalledTimes(4);
    expect(processDuplicateFiles).toHaveBeenCalledTimes(8);
    expect(result.zeroLengthFilesNumber).toBe(0);
    expect(result.filesToUpload.length).toBe(TOTAL_FILES);
  });

  it('should handle duplicates and non-duplicates', async () => {
    const files = Array(10)
      .fill(null)
      .map((_, i) => new MockFile([], `file${i}.txt`, { type: 'text/plain', size: i === 0 ? 0 : 1 }));
    const parentFolderId = 'parent123';

    (newStorageService.checkDuplicatedFiles as Mock)
      .mockResolvedValueOnce({
        existentFiles: [{ plainName: 'file2', type: 'txt' }],
      })
      .mockResolvedValueOnce({ existentFiles: [] });

    const checkDuplicatedFilesSpy = vi.spyOn(checkDuplicatedFilesModule, 'checkDuplicatedFiles');
    const processDuplicateFiles = vi.spyOn(processDuplicateFilesModule, 'processDuplicateFiles');

    const result = await prepareFilesToUpload({ files: files as File[], parentFolderId });

    expect(checkDuplicatedFilesSpy).toHaveBeenCalledTimes(1);
    expect(processDuplicateFiles).toHaveBeenCalledTimes(2);
    expect(result.zeroLengthFilesNumber).toBe(1);
  });

  it('should respect the disableDuplicatedNamesCheck flag', async () => {
    const files = [new File([], 'file.txt')];
    const parentFolderId = 'parent123';

    (checkDuplicatedFilesModule.checkDuplicatedFiles as Mock).mockResolvedValue({
      duplicatedFilesResponse: [{ name: 'file.txt' }],
      filesWithoutDuplicates: [],
      filesWithDuplicates: files,
    });

    const processDuplicateFiles = vi.spyOn(processDuplicateFilesModule, 'processDuplicateFiles');

    await prepareFilesToUpload({ files, parentFolderId, disableDuplicatedNamesCheck: true });

    expect(processDuplicateFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        disableDuplicatedNamesCheck: true,
      }),
    );
  });

  it('should handle fileType parameter', async () => {
    const files = [new File([], 'file.txt')];
    const parentFolderId = 'parent123';
    const fileType = 'text/plain';

    (checkDuplicatedFilesModule.checkDuplicatedFiles as Mock).mockResolvedValue({
      duplicatedFilesResponse: [],
      filesWithoutDuplicates: files,
      filesWithDuplicates: [],
    });

    const processDuplicateFiles = vi.spyOn(processDuplicateFilesModule, 'processDuplicateFiles');

    await prepareFilesToUpload({ files, parentFolderId, fileType });

    expect(processDuplicateFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        fileType: 'text/plain',
      }),
    );
  });
});
