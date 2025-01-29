import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prepareFilesToUpload } from './prepareFilesToUpload';
import { checkDuplicatedFiles } from './checkDuplicatedFiles';
import { processDuplicateFiles } from './processDuplicateFiles';
import { DriveFileData } from 'app/drive/types';

const BATCH_SIZE = 200;

vi.mock('./checkDuplicatedFiles', () => ({
  checkDuplicatedFiles: vi.fn(),
}));

vi.mock('./processDuplicateFiles', () => ({
  processDuplicateFiles: vi.fn(),
}));

describe('prepareFilesToUpload', () => {
  const mockFiles = [
    new File(['content'], 'file1.txt', { type: 'text/plain' }),
    new File([''], 'file2.txt', { type: 'text/plain' }),
  ];
  const parentFolderId = 'folder123';
  const mockFileType = 'text/plain';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process files without duplicates correctly', async () => {
    const filesWithoutDuplicates = [mockFiles[0]];
    vi.mocked(checkDuplicatedFiles).mockResolvedValue({
      duplicatedFilesResponse: [],
      filesWithoutDuplicates,
      filesWithDuplicates: [],
    });

    vi.mocked(processDuplicateFiles).mockResolvedValue({
      zeroLengthFiles: 0,
      newFilesToUpload: [
        {
          name: 'file1.txt',
          size: 7,
          type: 'text/plain',
          parentFolderId,
          content: new File(['content'], 'file1.txt', { type: 'text/plain' }),
        },
      ],
    });

    const result = await prepareFilesToUpload({
      files: mockFiles,
      parentFolderId,
      fileType: mockFileType,
    });

    expect(result.filesToUpload).toHaveLength(1);
    expect(result.filesToUpload[0]).toEqual({
      name: 'file1.txt',
      size: 7,
      type: 'text/plain',
      parentFolderId,
      content: new File(['content'], 'file1.txt', { type: 'text/plain' }),
    });
    expect(result.zeroLengthFilesNumber).toBe(0);

    expect(checkDuplicatedFiles).toHaveBeenCalledTimes(1);
    expect(processDuplicateFiles).toHaveBeenCalledTimes(2);
  });

  it('should handle duplicated files correctly', async () => {
    const duplicatedFilesResponse: DriveFileData[] = [
      {
        bucket: 'bucket123',
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString(),
        deleted: false,
        deletedAt: null,
        encrypt_version: '1',
        fileId: 'file1',
        folderId: 123,
        folder_id: 123,
        folderUuid: 'folderUuid123',
        id: 1,
        name: 'file1.txt',
        plain_name: 'file1.txt',
        plainName: 'file1.txt',
        size: 1024,
        type: 'text/plain',
        updatedAt: new Date().toISOString(),
        status: 'active',
        thumbnails: [],
        currentThumbnail: null,
        uuid: 'file-uuid-123',
      },
    ];
    const filesWithDuplicates = [mockFiles[0]];

    vi.mocked(checkDuplicatedFiles).mockResolvedValue({
      duplicatedFilesResponse,
      filesWithoutDuplicates: [],
      filesWithDuplicates,
    });

    vi.mocked(processDuplicateFiles).mockResolvedValue({
      zeroLengthFiles: 0,
      newFilesToUpload: [
        {
          name: 'file1.txt',
          size: 7,
          type: 'text/plain',
          parentFolderId,
          content: new File(['content'], 'file1.txt', { type: 'text/plain' }),
        },
      ],
    });

    const result = await prepareFilesToUpload({
      files: mockFiles,
      parentFolderId,
      fileType: mockFileType,
    });

    expect(result.filesToUpload).toHaveLength(1);
    expect(result.filesToUpload[0]).toEqual({
      name: 'file1.txt',
      size: 7,
      type: 'text/plain',
      parentFolderId,
      content: new File(['content'], 'file1.txt', { type: 'text/plain' }),
    });
    expect(result.zeroLengthFilesNumber).toBe(0);

    expect(checkDuplicatedFiles).toHaveBeenCalled();
    expect(processDuplicateFiles).toHaveBeenCalled();
  });

  it('should process files in batches correctly', async () => {
    const largeFileBatch = Array.from(
      { length: 250 },
      (_, i) => new File(['content'], `file${i + 1}.txt`, { type: 'text/plain' }),
    );

    vi.mocked(checkDuplicatedFiles).mockResolvedValue({
      duplicatedFilesResponse: [],
      filesWithoutDuplicates: largeFileBatch.slice(0, BATCH_SIZE),
      filesWithDuplicates: [],
    });

    vi.mocked(processDuplicateFiles).mockResolvedValue({
      zeroLengthFiles: 0,
      newFilesToUpload: largeFileBatch.slice(0, BATCH_SIZE).map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        parentFolderId,
        content: file,
      })),
    });

    const result = await prepareFilesToUpload({
      files: largeFileBatch,
      parentFolderId,
      fileType: mockFileType,
    });

    expect(result.filesToUpload).toHaveLength(200);
    expect(result.zeroLengthFilesNumber).toBe(0);
    expect(checkDuplicatedFiles).toHaveBeenCalledTimes(2);
    expect(processDuplicateFiles).toHaveBeenCalledTimes(4);
  });

  it('should process files in multiple batches correctly', async () => {
    const TOTAL_FILES = 800;
    const mockFiles = Array.from(
      { length: TOTAL_FILES },
      (_, index) => new File([], `file${index}.txt`, { type: 'text/plain' }),
    );

    const mockProcessedFiles = mockFiles.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      content: file,
      parentFolderId: 'parentFolderId',
    }));

    vi.mocked(checkDuplicatedFiles).mockResolvedValue({
      duplicatedFilesResponse: [],
      filesWithoutDuplicates: mockFiles.slice(0, BATCH_SIZE),
      filesWithDuplicates: mockFiles.slice(BATCH_SIZE),
    });

    vi.mocked(processDuplicateFiles).mockResolvedValue({
      zeroLengthFiles: 0,
      newFilesToUpload: mockProcessedFiles,
    });

    const { filesToUpload, zeroLengthFilesNumber } = await prepareFilesToUpload({
      files: mockFiles,
      parentFolderId: 'parentFolderId',
    });

    expect(checkDuplicatedFiles).toHaveBeenCalledTimes(4);
    expect(processDuplicateFiles).toHaveBeenCalledTimes(8);
    expect(filesToUpload).toHaveLength(TOTAL_FILES);
    expect(zeroLengthFilesNumber).toBe(0);
  });

  it('should handle fileType parameter', async () => {
    const mockFiles = [
      new File(['content1'], 'file1.txt', { type: 'text/plain' }),
      new File(['content2'], 'file2.txt', { type: 'text/plain' }),
    ];
    const parentFolderId = '123';
    const fileType = 'image/jpeg';

    const duplicatedFilesResponse = [];
    const filesWithoutDuplicates = mockFiles;
    const filesWithDuplicates = [];

    vi.mocked(checkDuplicatedFiles).mockResolvedValue({
      duplicatedFilesResponse,
      filesWithoutDuplicates,
      filesWithDuplicates,
    });

    const mockProcessDuplicateFiles = vi.mocked(processDuplicateFiles).mockResolvedValue({
      zeroLengthFiles: 0,
      newFilesToUpload: [
        {
          name: 'file1.txt',
          size: 10,
          type: 'text/plain',
          content: mockFiles[0],
          parentFolderId,
        },
        {
          name: 'file2.txt',
          size: 20,
          type: 'text/plain',
          content: mockFiles[1],
          parentFolderId,
        },
      ],
    });

    await prepareFilesToUpload({
      files: mockFiles,
      parentFolderId,
      fileType,
    });

    expect(mockProcessDuplicateFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        fileType,
      }),
    );
  });
});
