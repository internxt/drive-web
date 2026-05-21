import { describe, test, expect, vi, beforeEach } from 'vitest';
import { buildDriveItemData } from '../../../../../test/unit/fixtures/drive.fixtures';
import { moveItem } from './index';

const mockMoveFileByUuid = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockMoveFolderByUuid = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('app/drive/services/file.service', () => ({
  default: {
    moveFileByUuid: mockMoveFileByUuid,
  },
}));

vi.mock('app/drive/services/folder.service', () => ({
  default: {
    moveFolderByUuid: mockMoveFolderByUuid,
  },
}));

describe('Storage Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe('Moving an item', () => {
    test('When moving a file item with a new name, then the new name is forwarded to the file move operation', async () => {
      const fileUuid = 'file-uuid-abc';
      const destinationFolderId = 'dest-folder-uuid-xyz';
      const newName = 'renamed-file';
      const fileItem = buildDriveItemData({ uuid: fileUuid, isFolder: false });

      await moveItem(fileItem, destinationFolderId, newName);

      expect(mockMoveFileByUuid).toHaveBeenCalledWith(fileUuid, destinationFolderId, newName);
      expect(mockMoveFolderByUuid).not.toHaveBeenCalled();
    });

    test('When moving a file item without a new name, then the file move operation receives undefined for the name', async () => {
      const fileUuid = 'file-uuid-abc';
      const destinationFolderId = 'dest-folder-uuid-xyz';
      const fileItem = buildDriveItemData({ uuid: fileUuid, isFolder: false });

      await moveItem(fileItem, destinationFolderId);

      expect(mockMoveFileByUuid).toHaveBeenCalledWith(fileUuid, destinationFolderId, undefined);
      expect(mockMoveFolderByUuid).not.toHaveBeenCalled();
    });

    test('When moving a folder item with a new name, then the new name is forwarded to the folder move operation', async () => {
      const folderUuid = 'folder-uuid-abc';
      const destinationFolderId = 'dest-folder-uuid-xyz';
      const newName = 'renamed-folder';
      const folderItem = buildDriveItemData({ uuid: folderUuid, isFolder: true });

      await moveItem(folderItem, destinationFolderId, newName);

      expect(mockMoveFolderByUuid).toHaveBeenCalledWith(folderUuid, destinationFolderId, newName);
      expect(mockMoveFileByUuid).not.toHaveBeenCalled();
    });

    test('When moving a folder item without a new name, then the folder move operation receives undefined for the name', async () => {
      const folderUuid = 'folder-uuid-abc';
      const destinationFolderId = 'dest-folder-uuid-xyz';
      const folderItem = buildDriveItemData({ uuid: folderUuid, isFolder: true });

      await moveItem(folderItem, destinationFolderId);

      expect(mockMoveFolderByUuid).toHaveBeenCalledWith(folderUuid, destinationFolderId, undefined);
      expect(mockMoveFileByUuid).not.toHaveBeenCalled();
    });
  });
});
