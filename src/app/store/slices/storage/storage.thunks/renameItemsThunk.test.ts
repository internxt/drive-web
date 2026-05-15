import { describe, test, expect, vi, beforeEach } from 'vitest';
import { buildDriveItemData } from '../../../../../../test/unit/fixtures/drive.fixtures';

const {
  mockDispatch,
  mockSetFilesToRename,
  mockSetDriveFilesToRename,
  mockSetMoveDestinationFolderId,
  mockSetIsNameCollisionDialogOpen,
  mockSetFoldersToRename,
  mockSetDriveFoldersToRename,
  mockCheckDuplicatedFiles,
  mockCheckFolderDuplicated,
} = vi.hoisted(() => ({
  mockDispatch: vi.fn(),
  mockSetFilesToRename: vi.fn((items: unknown) => ({ type: 'setFilesToRename', payload: items })),
  mockSetDriveFilesToRename: vi.fn((items: unknown) => ({ type: 'setDriveFilesToRename', payload: items })),
  mockSetMoveDestinationFolderId: vi.fn((id: unknown) => ({ type: 'setMoveDestinationFolderId', payload: id })),
  mockSetIsNameCollisionDialogOpen: vi.fn((val: unknown) => ({ type: 'setIsNameCollisionDialogOpen', payload: val })),
  mockSetFoldersToRename: vi.fn((items: unknown) => ({ type: 'setFoldersToRename', payload: items })),
  mockSetDriveFoldersToRename: vi.fn((items: unknown) => ({ type: 'setDriveFoldersToRename', payload: items })),
  mockCheckDuplicatedFiles: vi.fn(),
  mockCheckFolderDuplicated: vi.fn(),
}));

vi.mock('app/store/slices/storage', () => ({
  storageActions: {
    setFilesToRename: mockSetFilesToRename,
    setDriveFilesToRename: mockSetDriveFilesToRename,
    setMoveDestinationFolderId: mockSetMoveDestinationFolderId,
    setFoldersToRename: mockSetFoldersToRename,
    setDriveFoldersToRename: mockSetDriveFoldersToRename,
  },
  storageSelectors: {},
  default: {},
}));
vi.mock('app/store/slices/ui', () => ({
  uiActions: { setIsNameCollisionDialogOpen: mockSetIsNameCollisionDialogOpen },
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
vi.mock('app/store/slices/storage/storage.thunks', () => ({ default: {} }));
vi.mock('i18next', () => ({ default: { t: (key: string) => key }, t: (key: string) => key }));
vi.mock('app/store/slices/storage/nameCollisionPromise', () => ({
  nameCollisionPromise: { wait: vi.fn().mockResolvedValue(undefined), resolve: vi.fn() },
}));

import { handleRepeatedUploadingFiles, handleRepeatedUploadingFolders } from './renameItemsThunk';

const duplicateResult = (file: unknown) => ({
  duplicatedFilesResponse: [file],
  filesWithDuplicates: [file],
  filesWithoutDuplicates: [],
});

const folderDuplicateResult = (folder: unknown) => ({
  duplicatedFoldersResponse: [folder],
  foldersWithDuplicates: [folder],
  foldersWithoutDuplicates: [],
});

describe('Duplicate file detection when moving files', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When moving a file to a folder where a file with the same name exists, the destination folder is remembered so the dialog can resolve the conflict there', async () => {
    const file = buildDriveItemData({ isFolder: false });
    mockCheckDuplicatedFiles.mockResolvedValue(duplicateResult(file));

    await handleRepeatedUploadingFiles([file], mockDispatch, 'dest-uuid', true);

    expect(mockSetMoveDestinationFolderId).toHaveBeenCalledWith('dest-uuid');
  });

  test('When uploading a file to a folder where a file with the same name exists, the destination is not stored as a move destination so the dialog stays in upload mode', async () => {
    const file = buildDriveItemData({ isFolder: false });
    mockCheckDuplicatedFiles.mockResolvedValue(duplicateResult(file));

    await handleRepeatedUploadingFiles([file], mockDispatch, 'dest-uuid', false);

    expect(mockSetMoveDestinationFolderId).not.toHaveBeenCalled();
  });

  test('When no operation type is specified and a duplicate file is found, the dialog opens in upload mode by default', async () => {
    const file = buildDriveItemData({ isFolder: false });
    mockCheckDuplicatedFiles.mockResolvedValue(duplicateResult(file));

    await handleRepeatedUploadingFiles([file], mockDispatch, 'dest-uuid');

    expect(mockSetMoveDestinationFolderId).not.toHaveBeenCalled();
  });
});

describe('Duplicate folder detection when moving folders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When moving a folder to a location where a folder with the same name exists, the destination folder is remembered so the dialog can resolve the conflict there', async () => {
    const folder = buildDriveItemData({ isFolder: true });
    mockCheckFolderDuplicated.mockResolvedValue(folderDuplicateResult(folder));

    await handleRepeatedUploadingFolders([folder], mockDispatch, 'dest-uuid', true);

    expect(mockSetMoveDestinationFolderId).toHaveBeenCalledWith('dest-uuid');
  });

  test('When uploading a folder to a location where a folder with the same name exists, the destination is not stored as a move destination so the dialog stays in upload mode', async () => {
    const folder = buildDriveItemData({ isFolder: true });
    mockCheckFolderDuplicated.mockResolvedValue(folderDuplicateResult(folder));

    await handleRepeatedUploadingFolders([folder], mockDispatch, 'dest-uuid', false);

    expect(mockSetMoveDestinationFolderId).not.toHaveBeenCalled();
  });

  test('When no operation type is specified and a duplicate folder is found, the dialog opens in upload mode by default', async () => {
    const folder = buildDriveItemData({ isFolder: true });
    mockCheckFolderDuplicated.mockResolvedValue(folderDuplicateResult(folder));

    await handleRepeatedUploadingFolders([folder], mockDispatch, 'dest-uuid');

    expect(mockSetMoveDestinationFolderId).not.toHaveBeenCalled();
  });
});
