import { describe, test, expect, vi, beforeEach } from 'vitest';
import { getCollisionGroups, handleRepeatedUploadingFiles, handleRepeatedUploadingFolders } from './renameItemsThunk';
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

describe('Rename items - Thunk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Resolving collision groups before a move or copy operation', () => {
    test('When a group contains only files, then only the file duplicate checker is consulted', async () => {
      const file = buildDriveItemData({ isFolder: false, uuid: 'file-uuid-1' });
      mockCheckDuplicatedFiles.mockResolvedValue({
        filesWithDuplicates: [],
        duplicatedFilesResponse: [],
        filesWithoutDuplicates: [file],
      });

      const result = await getCollisionGroups([{ destinationUuid: 'dest-uuid', items: [file] }]);

      expect(mockCheckDuplicatedFiles).toHaveBeenCalledOnce();
      expect(mockCheckFolderDuplicated).not.toHaveBeenCalled();
      expect(result[0].unrepeatedItems).toContain(file);
    });

    test('When a group contains only folders, then only the folder duplicate checker is consulted', async () => {
      const folder = buildDriveItemData({ isFolder: true, uuid: 'folder-uuid-1' });
      mockCheckFolderDuplicated.mockResolvedValue({
        foldersWithDuplicates: [],
        duplicatedFoldersResponse: [],
        foldersWithoutDuplicates: [folder],
      });

      const result = await getCollisionGroups([{ destinationUuid: 'dest-uuid', items: [folder] }]);

      expect(mockCheckFolderDuplicated).toHaveBeenCalledOnce();
      expect(mockCheckDuplicatedFiles).not.toHaveBeenCalled();
      expect(result[0].unrepeatedItems).toContain(folder);
    });

    test('When a group contains both files and folders, then both duplicate checkers are consulted', async () => {
      const file = buildDriveItemData({ isFolder: false, uuid: 'file-uuid-2' });
      const folder = buildDriveItemData({ isFolder: true, uuid: 'folder-uuid-2' });
      mockCheckDuplicatedFiles.mockResolvedValue({
        filesWithDuplicates: [],
        duplicatedFilesResponse: [],
        filesWithoutDuplicates: [file],
      });
      mockCheckFolderDuplicated.mockResolvedValue({
        foldersWithDuplicates: [],
        duplicatedFoldersResponse: [],
        foldersWithoutDuplicates: [folder],
      });

      const result = await getCollisionGroups([{ destinationUuid: 'dest-uuid', items: [file, folder] }]);

      expect(mockCheckDuplicatedFiles).toHaveBeenCalledOnce();
      expect(mockCheckFolderDuplicated).toHaveBeenCalledOnce();
      expect(result[0].unrepeatedItems).toContain(file);
      expect(result[0].unrepeatedItems).toContain(folder);
    });

    test('When an item group is empty, then no duplicate checkers are called and all result arrays are empty', async () => {
      const result = await getCollisionGroups([{ destinationUuid: 'dest-uuid', items: [] }]);

      expect(mockCheckDuplicatedFiles).not.toHaveBeenCalled();
      expect(mockCheckFolderDuplicated).not.toHaveBeenCalled();
      expect(result[0].duplicatedItems).toHaveLength(0);
      expect(result[0].existingItems).toHaveLength(0);
      expect(result[0].unrepeatedItems).toHaveLength(0);
    });

    test('When items collide in the destination, then they appear in duplicated items and existing items', async () => {
      const movingFile = buildDriveItemData({ isFolder: false, uuid: 'file-moving' });
      const existingFile = buildDriveItemData({ isFolder: false, uuid: 'file-existing' });
      const movingFolder = buildDriveItemData({ isFolder: true, uuid: 'folder-moving' });
      const existingFolder = buildDriveItemData({ isFolder: true, uuid: 'folder-existing' });
      mockCheckDuplicatedFiles.mockResolvedValue({
        filesWithDuplicates: [movingFile],
        duplicatedFilesResponse: [existingFile],
        filesWithoutDuplicates: [],
      });
      mockCheckFolderDuplicated.mockResolvedValue({
        foldersWithDuplicates: [movingFolder],
        duplicatedFoldersResponse: [existingFolder],
        foldersWithoutDuplicates: [],
      });

      const result = await getCollisionGroups([{ destinationUuid: 'dest-uuid', items: [movingFile, movingFolder] }]);

      expect(result[0].duplicatedItems).toContain(movingFile);
      expect(result[0].duplicatedItems).toContain(movingFolder);
      expect(result[0].existingItems).toContain(existingFile);
      expect(result[0].existingItems).toContain(existingFolder);
      expect(result[0].unrepeatedItems).toHaveLength(0);
    });

    test('When items do not collide in the destination, then they appear only as an unrepeated item', async () => {
      const file = buildDriveItemData({ isFolder: false, uuid: 'file-uuid-3' });
      const folder = buildDriveItemData({ isFolder: true, uuid: 'folder-uuid-3' });
      mockCheckDuplicatedFiles.mockResolvedValue({
        filesWithDuplicates: [],
        duplicatedFilesResponse: [],
        filesWithoutDuplicates: [file],
      });
      mockCheckFolderDuplicated.mockResolvedValue({
        foldersWithDuplicates: [],
        duplicatedFoldersResponse: [],
        foldersWithoutDuplicates: [folder],
      });

      const result = await getCollisionGroups([{ destinationUuid: 'dest-uuid', items: [file, folder] }]);

      expect(result[0].unrepeatedItems).toContain(file);
      expect(result[0].unrepeatedItems).toContain(folder);
      expect(result[0].duplicatedItems).toHaveLength(0);
      expect(result[0].existingItems).toHaveLength(0);
    });

    test('When multiple destination groups are provided, then each group is resolved independently', async () => {
      const fileA = buildDriveItemData({ isFolder: false, uuid: 'file-a' });
      const fileB = buildDriveItemData({ isFolder: false, uuid: 'file-b' });
      mockCheckDuplicatedFiles
        .mockResolvedValueOnce({
          filesWithDuplicates: [fileA],
          duplicatedFilesResponse: [],
          filesWithoutDuplicates: [],
        })
        .mockResolvedValueOnce({
          filesWithDuplicates: [],
          duplicatedFilesResponse: [],
          filesWithoutDuplicates: [fileB],
        });

      const result = await getCollisionGroups([
        { destinationUuid: 'dest-uuid-a', items: [fileA] },
        { destinationUuid: 'dest-uuid-b', items: [fileB] },
      ]);

      expect(result).toHaveLength(2);
      expect(result[0].destinationUuid).toBe('dest-uuid-a');
      expect(result[0].duplicatedItems).toContain(fileA);
      expect(result[0].unrepeatedItems).toHaveLength(0);
      expect(result[1].destinationUuid).toBe('dest-uuid-b');
      expect(result[1].unrepeatedItems).toContain(fileB);
      expect(result[1].duplicatedItems).toHaveLength(0);
    });
  });

  describe('Handling repeated files', () => {
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

  describe('Handling repeated folders', () => {
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
});
