import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getDriveItemData } from 'testUtils/fixtures/drive.fixtures';
import { IRoot } from 'app/store/slices/storage/types';
import { NameCollisionContext, ResolveCollisionParams, resolveCollision } from './nameCollision.actions';

const mocks = vi.hoisted(() => ({
  moveItemsToTrash: vi.fn(),
  moveItemsThunk: vi.fn(),
  uploadItemsThunk: vi.fn(),
  fetchSortedFolderContentThunk: vi.fn(),
  popItemsToDelete: vi.fn(),
  invalidateCache: vi.fn(),
  checkDuplicatedFiles: vi.fn(),
  getUniqueFilename: vi.fn(),
  checkFolderDuplicated: vi.fn(),
  getUniqueFolderName: vi.fn(),
  uploadFoldersWithTracking: vi.fn(),
  getEnvironmentConfig: vi.fn(),
  networkUploadFile: vi.fn(),
  replaceFile: vi.fn(),
}));

vi.mock('views/Trash/services', () => ({ moveItemsToTrash: mocks.moveItemsToTrash }));
vi.mock('app/store/slices/storage/storage.thunks', () => ({
  default: { moveItemsThunk: mocks.moveItemsThunk, uploadItemsThunk: mocks.uploadItemsThunk },
}));
vi.mock('app/store/slices/storage/storage.thunks/fetchSortedFolderContentThunk', () => ({
  fetchSortedFolderContentThunk: mocks.fetchSortedFolderContentThunk,
}));
vi.mock('app/store/slices/storage', () => ({ storageActions: { popItemsToDelete: mocks.popItemsToDelete } }));
vi.mock('app/store/slices/fileVersions', () => ({ fileVersionsActions: { invalidateCache: mocks.invalidateCache } }));
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
vi.mock('app/drive/services/folder.service/uploadFoldersWithTracking', () => ({
  uploadFoldersWithTracking: mocks.uploadFoldersWithTracking,
}));
vi.mock('app/drive/services/network.service', () => ({
  getEnvironmentConfig: mocks.getEnvironmentConfig,
  Network: class {
    uploadFile = mocks.networkUploadFile;
  },
}));
vi.mock('views/Drive/services/replaceFile.service', () => ({ default: { replaceFile: mocks.replaceFile } }));
vi.mock('views/Drive/components/VersionHistory/utils', () => ({
  isVersioningExtensionAllowed: (item?: { type?: string }) => item?.type === 'pdf',
}));

const DESTINATION = 'destination-uuid';

const getRoot = (name = 'Photos'): IRoot => ({
  name,
  folderId: null,
  childrenFiles: [],
  childrenFolders: [],
  fullPathEdited: `/${name}`,
});

const getContext = (overrides: Partial<NameCollisionContext> = {}): NameCollisionContext => ({
  dispatch: vi.fn() as unknown as NameCollisionContext['dispatch'],
  selectedWorkspace: null,
  maxUploadFileSize: 5000,
  isVersioningEnabled: false,
  ...overrides,
});

const resolve = (params: Omit<ResolveCollisionParams, 'destinationUuid'>, context = getContext()) =>
  resolveCollision({ ...params, destinationUuid: DESTINATION }, context);

/**
 * Mocks are reset by hand because the browser test project does not do it between tests.
 */
beforeEach(() => {
  vi.resetAllMocks();
  mocks.checkDuplicatedFiles.mockResolvedValue({ duplicatedFilesResponse: ['file-dup'] });
  mocks.getUniqueFilename.mockResolvedValue('report (1)');
  mocks.checkFolderDuplicated.mockResolvedValue({ duplicatedFoldersResponse: ['folder-dup'] });
  mocks.getUniqueFolderName.mockResolvedValue('Photos (1)');
  mocks.getEnvironmentConfig.mockResolvedValue({ bridgeUser: 'u', bridgePass: 'p', encryptionKey: 'k', bucketId: 'b' });
  mocks.networkUploadFile.mockReturnValue([Promise.resolve('new-file-id'), undefined]);
});

describe('resolveCollision', () => {
  test('when moving with keep, then each item is moved under a unique name and leaves the pending deletion list', async () => {
    const file = getDriveItemData({ plainName: 'report', name: 'report', type: 'pdf', isFolder: false });
    const folder = getDriveItemData({ plainName: 'Photos', name: 'Photos', isFolder: true });

    await resolve({ operationType: 'move', operation: 'keep', items: [file, folder], existingItems: [] });

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
    expect(mocks.popItemsToDelete).toHaveBeenCalledWith([file, folder]);
  });

  test('when moving with replace, then existing items are trashed before moving and moved items leave the pending deletion list', async () => {
    const item = getDriveItemData({ uuid: 'new' });
    const existing = getDriveItemData({ uuid: 'existing' });
    const callOrder: string[] = [];
    mocks.moveItemsToTrash.mockImplementation(async () => callOrder.push('trash'));
    mocks.moveItemsThunk.mockImplementation(() => callOrder.push('move'));

    await resolve({ operationType: 'move', operation: 'replace', items: [item], existingItems: [existing] });

    expect(mocks.moveItemsToTrash).toHaveBeenCalledWith([existing]);
    expect(mocks.moveItemsThunk).toHaveBeenCalledWith({ items: [item], destinationFolderId: DESTINATION });
    expect(callOrder).toEqual(['trash', 'move']);
    expect(mocks.popItemsToDelete).toHaveBeenCalledWith([item]);
  });

  test('when uploading with keep, then folders upload with tracking, files upload with the duplicates check, and the folder is refreshed', async () => {
    const context = getContext({ maxUploadFileSize: 123, selectedWorkspace: { id: 'ws' } as never });
    const file = new File(['content'], 'report.pdf');
    const root = getRoot();

    await resolve({ operationType: 'upload', operation: 'keep', items: [file, root], existingItems: [] }, context);

    expect(mocks.uploadItemsThunk).toHaveBeenCalledWith({
      files: [file],
      parentFolderId: DESTINATION,
      options: undefined,
    });
    expect(mocks.uploadFoldersWithTracking).toHaveBeenCalledWith({
      payload: [{ root: { ...root }, currentFolderId: DESTINATION }],
      selectedWorkspace: { id: 'ws' },
      dispatch: context.dispatch,
      maxUploadFileSize: 123,
    });
    expect(mocks.fetchSortedFolderContentThunk).toHaveBeenCalledTimes(2);
    expect(mocks.popItemsToDelete).not.toHaveBeenCalled();
  });

  test('when uploading with replace and versioning is off, then each existing item is trashed and the new one is uploaded without the duplicates check', async () => {
    const file = new File(['content'], 'report.pdf');
    const root = getRoot();
    const existingFile = getDriveItemData({ uuid: 'existing-file', type: 'pdf' });
    const existingFolder = getDriveItemData({ uuid: 'existing-folder', isFolder: true });

    await resolve({
      operationType: 'upload',
      operation: 'replace',
      items: [file, root],
      existingItems: [existingFile, existingFolder],
    });

    expect(mocks.moveItemsToTrash).toHaveBeenNthCalledWith(1, [existingFile]);
    expect(mocks.moveItemsToTrash).toHaveBeenNthCalledWith(2, [existingFolder]);
    expect(mocks.uploadItemsThunk).toHaveBeenCalledWith({
      files: [file],
      parentFolderId: DESTINATION,
      options: { disableDuplicatedNamesCheck: true },
    });
    expect(mocks.uploadFoldersWithTracking).toHaveBeenCalledWith(
      expect.objectContaining({ payload: [{ root: { ...root }, currentFolderId: DESTINATION }] }),
    );
    expect(mocks.networkUploadFile).not.toHaveBeenCalled();
    expect(mocks.fetchSortedFolderContentThunk).toHaveBeenCalledTimes(2);
  });

  test('when uploading with replace and versioning is on, then allowed extensions become a new version while the rest are trashed and re-uploaded', async () => {
    const context = getContext({ isVersioningEnabled: true, selectedWorkspace: { id: 'ws' } as never });
    const pdf = new File(['content'], 'report.pdf');
    const image = new File(['content'], 'photo.png');
    const existingPdf = getDriveItemData({ uuid: 'existing-pdf', type: 'pdf' });
    const existingImage = getDriveItemData({ uuid: 'existing-png', type: 'png' });

    await resolve(
      {
        operationType: 'upload',
        operation: 'replace',
        items: [pdf, image],
        existingItems: [existingPdf, existingImage],
      },
      context,
    );

    expect(mocks.getEnvironmentConfig).toHaveBeenCalledWith(true);
    expect(mocks.networkUploadFile).toHaveBeenCalledWith(
      'b',
      expect.objectContaining({ filecontent: pdf, filesize: pdf.size }),
      { taskId: expect.stringMatching(/^replace-existing-pdf-\d+$/) },
    );
    expect(mocks.replaceFile).toHaveBeenCalledWith('existing-pdf', { fileId: 'new-file-id', size: pdf.size });
    expect(mocks.invalidateCache).toHaveBeenCalledWith('existing-pdf');
    expect(mocks.moveItemsToTrash).toHaveBeenCalledWith([existingImage]);
    expect(mocks.uploadItemsThunk).toHaveBeenCalledWith(expect.objectContaining({ files: [image] }));
    expect(mocks.fetchSortedFolderContentThunk).toHaveBeenCalledTimes(2);
  });
});
