import { describe, test, expect, vi, beforeEach } from 'vitest';
import { handleRepeatedUploadingFiles, handleRepeatedUploadingFolders } from './renameItemsThunk';
import { buildDriveItemData } from '../../../../../../test/unit/fixtures/drive.fixtures';

const { mockCheckDuplicatedFiles, mockCheckFolderDuplicated } = vi.hoisted(() => ({
  mockCheckDuplicatedFiles: vi.fn(),
  mockCheckFolderDuplicated: vi.fn(),
}));

vi.mock('app/store/slices/storage/fileUtils/checkDuplicatedFiles', () => ({
  checkDuplicatedFiles: mockCheckDuplicatedFiles,
}));
vi.mock('app/store/slices/storage/folderUtils/checkFolderDuplicated', () => ({
  checkFolderDuplicated: mockCheckFolderDuplicated,
}));
vi.mock('app/store/slices/storage/fileUtils/getFilesByBatchs', () => ({
  getFilesByBatchs: (items: unknown[]) => [items],
}));
vi.mock('app/store/slices/storage/storage.thunks', () => ({ default: {}, storageExtraReducers: () => undefined }));
vi.mock('i18next', () => ({ default: { t: (key: string) => key }, t: (key: string) => key }));

describe('Handling repeated files', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When a file has a duplicate in the destination, it is returned as a repeated item', async () => {
    const file = buildDriveItemData({ isFolder: false });
    mockCheckDuplicatedFiles.mockResolvedValue({
      filesWithDuplicates: [file],
      duplicatedFilesResponse: [file],
      filesWithoutDuplicates: [],
    });

    const result = await handleRepeatedUploadingFiles([file], 'dest-uuid');

    expect(result.repeatedItems).toContain(file);
    expect(result.existingItems).toContain(file);
    expect(result.unrepeatedItems).toHaveLength(0);
  });

  test('When a file has no duplicate in the destination, it is returned as an unrepeated item', async () => {
    const file = buildDriveItemData({ isFolder: false });
    mockCheckDuplicatedFiles.mockResolvedValue({
      filesWithDuplicates: [],
      duplicatedFilesResponse: [],
      filesWithoutDuplicates: [file],
    });

    const result = await handleRepeatedUploadingFiles([file], 'dest-uuid');

    expect(result.repeatedItems).toHaveLength(0);
    expect(result.existingItems).toHaveLength(0);
    expect(result.unrepeatedItems).toContain(file);
  });

  test('When multiple files are checked, duplicates and non-duplicates are correctly separated', async () => {
    const duplicate = buildDriveItemData({ isFolder: false });
    const unique = buildDriveItemData({ isFolder: false });
    mockCheckDuplicatedFiles.mockResolvedValue({
      filesWithDuplicates: [duplicate],
      duplicatedFilesResponse: [duplicate],
      filesWithoutDuplicates: [unique],
    });

    const result = await handleRepeatedUploadingFiles([duplicate, unique], 'dest-uuid');

    expect(result.repeatedItems).toContain(duplicate);
    expect(result.unrepeatedItems).toContain(unique);
  });
});

describe('handleRepeatedUploadingFolders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When a folder has a duplicate in the destination, it is returned as a repeated item', async () => {
    const folder = buildDriveItemData({ isFolder: true });
    mockCheckFolderDuplicated.mockResolvedValue({
      foldersWithDuplicates: [folder],
      duplicatedFoldersResponse: [folder],
      foldersWithoutDuplicates: [],
    });

    const result = await handleRepeatedUploadingFolders([folder], 'dest-uuid');

    expect(result.repeatedItems).toContain(folder);
    expect(result.existingItems).toContain(folder);
    expect(result.unrepeatedItems).toHaveLength(0);
  });

  test('When a folder has no duplicate in the destination, it is returned as an unrepeated item', async () => {
    const folder = buildDriveItemData({ isFolder: true });
    mockCheckFolderDuplicated.mockResolvedValue({
      foldersWithDuplicates: [],
      duplicatedFoldersResponse: [],
      foldersWithoutDuplicates: [folder],
    });

    const result = await handleRepeatedUploadingFolders([folder], 'dest-uuid');

    expect(result.repeatedItems).toHaveLength(0);
    expect(result.existingItems).toHaveLength(0);
    expect(result.unrepeatedItems).toContain(folder);
  });

  test('When multiple folders are checked, duplicates and non-duplicates are correctly separated', async () => {
    const duplicate = buildDriveItemData({ isFolder: true });
    const unique = buildDriveItemData({ isFolder: true });
    mockCheckFolderDuplicated.mockResolvedValue({
      foldersWithDuplicates: [duplicate],
      duplicatedFoldersResponse: [duplicate],
      foldersWithoutDuplicates: [unique],
    });

    const result = await handleRepeatedUploadingFolders([duplicate, unique], 'dest-uuid');

    expect(result.repeatedItems).toContain(duplicate);
    expect(result.unrepeatedItems).toContain(unique);
  });
});
