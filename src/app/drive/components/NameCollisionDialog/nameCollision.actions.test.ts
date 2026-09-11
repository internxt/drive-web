import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getDriveItemData } from 'testUtils/fixtures/drive.fixtures';
import { NameCollisionContext, ResolveMoveCollisionParams, resolveMoveCollision } from './nameCollision.actions';

const mocks = vi.hoisted(() => ({
  moveItemsToTrash: vi.fn(),
  moveItemsThunk: vi.fn(),
  popItemsToDelete: vi.fn(),
  checkDuplicatedFiles: vi.fn(),
  getUniqueFilename: vi.fn(),
  checkFolderDuplicated: vi.fn(),
  getUniqueFolderName: vi.fn(),
}));

vi.mock('views/Trash/services', () => ({ moveItemsToTrash: mocks.moveItemsToTrash }));
vi.mock('app/store/slices/storage/storage.thunks', () => ({ default: { moveItemsThunk: mocks.moveItemsThunk } }));
vi.mock('app/store/slices/storage', () => ({ storageActions: { popItemsToDelete: mocks.popItemsToDelete } }));
vi.mock('app/store/slices/storage/fileUtils/checkDuplicatedFiles', () => ({
  checkDuplicatedFiles: mocks.checkDuplicatedFiles,
}));
vi.mock('app/store/slices/storage/fileUtils/getUniqueFilename', () => ({ getUniqueFilename: mocks.getUniqueFilename }));
vi.mock('app/store/slices/storage/folderUtils/checkFolderDuplicated', () => ({
  checkFolderDuplicated: mocks.checkFolderDuplicated,
}));
vi.mock('app/store/slices/storage/folderUtils/getUniqueFolderName', () => ({
  getUniqueFolderName: mocks.getUniqueFolderName,
}));

const DESTINATION = 'destination-uuid';

const getContext = (): NameCollisionContext => ({
  dispatch: vi.fn() as unknown as NameCollisionContext['dispatch'],
  selectedWorkspace: null,
  maxUploadFileSize: 5000,
  isVersioningEnabled: false,
});

const resolve = (params: Omit<ResolveMoveCollisionParams, 'destinationUuid'>) =>
  resolveMoveCollision({ ...params, destinationUuid: DESTINATION }, getContext());

/**
 * Mocks are reset by hand because the browser test project does not do it between tests.
 */
beforeEach(() => {
  vi.resetAllMocks();
  mocks.checkDuplicatedFiles.mockResolvedValue({ duplicatedFilesResponse: ['file-dup'] });
  mocks.getUniqueFilename.mockResolvedValue('report (1)');
  mocks.checkFolderDuplicated.mockResolvedValue({ duplicatedFoldersResponse: ['folder-dup'] });
  mocks.getUniqueFolderName.mockResolvedValue('Photos (1)');
});

describe('resolveMoveCollision', () => {
  test('when keeping both, then each item is moved under a unique name and leaves the pending deletion list', async () => {
    const file = getDriveItemData({ plainName: 'report', name: 'report', type: 'pdf', isFolder: false });
    const folder = getDriveItemData({ plainName: 'Photos', name: 'Photos', isFolder: true });

    await resolve({ operation: 'keep', items: [file, folder], existingItems: [] });

    expect(mocks.getUniqueFilename).toHaveBeenCalledWith('report', 'pdf', ['file-dup'], DESTINATION);
    expect(mocks.getUniqueFolderName).toHaveBeenCalledWith('Photos', ['folder-dup'], DESTINATION);
    expect(mocks.moveItemsThunk).toHaveBeenNthCalledWith(1, {
      items: [
        { ...file, name: 'report (1)', plainName: 'report (1)', plain_name: 'report (1)', newItemName: 'report (1)' },
      ],
      destinationFolderId: DESTINATION,
    });
    expect(mocks.moveItemsThunk).toHaveBeenNthCalledWith(2, {
      items: [{ ...folder, name: 'Photos (1)', plain_name: 'Photos (1)', newItemName: 'Photos (1)' }],
      destinationFolderId: DESTINATION,
    });
    expect(mocks.moveItemsToTrash).not.toHaveBeenCalled();
    expect(mocks.popItemsToDelete).toHaveBeenCalledWith([file, folder]);
  });

  test('when replacing, then existing items are trashed before moving and moved items leave the pending deletion list', async () => {
    const item = getDriveItemData({ uuid: 'new' });
    const existing = getDriveItemData({ uuid: 'existing' });
    const callOrder: string[] = [];
    mocks.moveItemsToTrash.mockImplementation(async () => callOrder.push('trash'));
    mocks.moveItemsThunk.mockImplementation(() => callOrder.push('move'));

    await resolve({ operation: 'replace', items: [item], existingItems: [existing] });

    expect(mocks.moveItemsToTrash).toHaveBeenCalledWith([existing]);
    expect(mocks.moveItemsThunk).toHaveBeenCalledWith({ items: [item], destinationFolderId: DESTINATION });
    expect(callOrder).toEqual(['trash', 'move']);
    expect(mocks.popItemsToDelete).toHaveBeenCalledWith([item]);
  });
});
