import { DriveFileData } from 'app/drive/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkDuplicatedFiles } from './checkDuplicatedFiles';
import { prepareFilesToUpload } from './prepareFilesToUpload';
import { processDuplicateFiles } from './processDuplicateFiles';

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
    vi.resetModules();
  });

  it('should process files without duplicates correctly', async () => {
    const filesWithoutDuplicates = [mockFiles[0]];
    vi.mocked(checkDuplicatedFiles).mockResolvedValue({
      duplicatedFilesResponse: [],
      filesWithoutDuplicates,
      filesWithDuplicates: [],
    });

    vi.mocked(processDuplicateFiles).mockResolvedValue({
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
      newFilesToUpload: mockProcessedFiles,
    });

    const { filesToUpload } = await prepareFilesToUpload({
      files: mockFiles,
      parentFolderId: 'parentFolderId',
    });

    expect(checkDuplicatedFiles).toHaveBeenCalledTimes(4);
    expect(processDuplicateFiles).toHaveBeenCalledTimes(8);
    expect(filesToUpload).toHaveLength(TOTAL_FILES);
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

  it('should filter hidden files when notUploadHiddenFiles is true', async () => {
    const mockFilesWithHidden = [
      new File(['content'], 'file1.txt', { type: 'text/plain' }),
      new File(['content'], '.hidden-file', { type: 'text/plain' }),
      new File(['content'], '.DS_Store', { type: 'text/plain' }),
      new File(['content'], 'normal-file.txt', { type: 'text/plain' }),
    ];

    const visibleFiles = [mockFilesWithHidden[0], mockFilesWithHidden[3]];

    vi.mocked(checkDuplicatedFiles).mockResolvedValue({
      duplicatedFilesResponse: [],
      filesWithoutDuplicates: visibleFiles,
      filesWithDuplicates: [],
    });

    vi.mocked(processDuplicateFiles).mockResolvedValue({
      newFilesToUpload: visibleFiles.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        parentFolderId,
        content: file,
      })),
    });

    const result = await prepareFilesToUpload({
      files: mockFilesWithHidden,
      parentFolderId,
      notUploadHiddenFiles: true,
    });

    expect(result.filesToUpload).toHaveLength(2);
    expect(result.filesToUpload[0].name).toBe('file1.txt');
    expect(result.filesToUpload[1].name).toBe('normal-file.txt');

    expect(checkDuplicatedFiles).toHaveBeenCalledWith(visibleFiles, parentFolderId);
  });

  it('should not filter hidden files when notUploadHiddenFiles is false', async () => {
    const mockFilesWithHidden = [
      new File(['content'], 'file1.txt', { type: 'text/plain' }),
      new File(['content'], '.hidden-file', { type: 'text/plain' }),
      new File(['content'], '.DS_Store', { type: 'text/plain' }),
    ];

    vi.mocked(checkDuplicatedFiles).mockResolvedValue({
      duplicatedFilesResponse: [],
      filesWithoutDuplicates: mockFilesWithHidden,
      filesWithDuplicates: [],
    });

    vi.mocked(processDuplicateFiles).mockResolvedValue({
      newFilesToUpload: mockFilesWithHidden.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        parentFolderId,
        content: file,
      })),
    });

    const result = await prepareFilesToUpload({
      files: mockFilesWithHidden,
      parentFolderId,
      notUploadHiddenFiles: false,
    });

    expect(result.filesToUpload).toHaveLength(3);
    expect(result.filesToUpload.map((f) => f.name)).toEqual(['file1.txt', '.hidden-file', '.DS_Store']);

    expect(checkDuplicatedFiles).toHaveBeenCalledWith(mockFilesWithHidden, parentFolderId);
  });

  it('should not filter hidden files when notUploadHiddenFiles is undefined', async () => {
    const mockFilesWithHidden = [
      new File(['content'], 'file1.txt', { type: 'text/plain' }),
      new File(['content'], '.hidden-file', { type: 'text/plain' }),
    ];

    vi.mocked(checkDuplicatedFiles).mockResolvedValue({
      duplicatedFilesResponse: [],
      filesWithoutDuplicates: mockFilesWithHidden,
      filesWithDuplicates: [],
    });

    vi.mocked(processDuplicateFiles).mockResolvedValue({
      newFilesToUpload: mockFilesWithHidden.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        parentFolderId,
        content: file,
      })),
    });

    const result = await prepareFilesToUpload({
      files: mockFilesWithHidden,
      parentFolderId,
    });

    expect(result.filesToUpload).toHaveLength(2);
    expect(result.filesToUpload.map((f) => f.name)).toEqual(['file1.txt', '.hidden-file']);

    expect(checkDuplicatedFiles).toHaveBeenCalledWith(mockFilesWithHidden, parentFolderId);
  });

  it('should handle empty array when all files are hidden and notUploadHiddenFiles is true', async () => {
    const mockHiddenFiles = [
      new File(['content'], '.hidden1', { type: 'text/plain' }),
      new File(['content'], '.hidden2', { type: 'text/plain' }),
    ];

    const result = await prepareFilesToUpload({
      files: mockHiddenFiles,
      parentFolderId,
      notUploadHiddenFiles: true,
    });

    expect(result.filesToUpload).toHaveLength(0);

    expect(checkDuplicatedFiles).not.toHaveBeenCalled();
    expect(processDuplicateFiles).not.toHaveBeenCalled();
  });
});
