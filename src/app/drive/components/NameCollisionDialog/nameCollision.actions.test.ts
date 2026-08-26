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
  handleRepeatedUploadingFiles: vi.fn(),
  handleRepeatedUploadingFolders: vi.fn(),
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
vi.mock('app/store/slices/storage/storage.thunks/renameItemsThunk', () => ({
  handleRepeatedUploadingFiles: mocks.handleRepeatedUploadingFiles,
  handleRepeatedUploadingFolders: mocks.handleRepeatedUploadingFolders,
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

const getRoot = (name = 'Photos', children: Partial<Pick<IRoot, 'childrenFiles' | 'childrenFolders'>> = {}): IRoot => ({
  name,
  folderId: null,
  childrenFiles: [],
  childrenFolders: [],
  fullPathEdited: `/${name}`,
  ...children,
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
  test.each<[ResolveCollisionParams['operationType'], ResolveCollisionParams['operation']]>([
    ['move', 'skip'],
    ['upload', 'skip'],
    ['move', 'keep'],
    ['move', 'replace'],
    ['upload', 'keep'],
    ['upload', 'replace'],
  ])(
    'when %s + %s has nothing to resolve, then nothing is moved, trashed or uploaded',
    async (operationType, operation) => {
      const items = operation === 'skip' ? [getDriveItemData()] : [];

      await resolve({ operationType, operation, items, existingItems: [] });

      expect(mocks.moveItemsToTrash).not.toHaveBeenCalled();
      expect(mocks.moveItemsThunk).not.toHaveBeenCalled();
      expect(mocks.uploadItemsThunk).not.toHaveBeenCalled();
      expect(mocks.uploadFoldersWithTracking).not.toHaveBeenCalled();
      expect(mocks.fetchSortedFolderContentThunk).not.toHaveBeenCalled();
    },
  );

  test('when moving with keep, then items get a unique name and leave the pending deletion list', async () => {
    const file = getDriveItemData({ plainName: 'report', name: 'report', type: 'pdf', isFolder: false });
    const folder = getDriveItemData({ plainName: 'Photos', name: 'Photos', isFolder: true });

    await resolve({ operationType: 'move', operation: 'keep', items: [file, folder], existingItems: [] });

    expect(mocks.getUniqueFilename).toHaveBeenCalledWith('report', 'pdf', ['file-dup'], DESTINATION);
    expect(mocks.getUniqueFolderName).toHaveBeenCalledWith('Photos', ['folder-dup'], DESTINATION);
    expect(mocks.moveItemsThunk).toHaveBeenCalledWith({
      items: [
        { ...file, name: 'report (1)', plainName: 'report (1)', plain_name: 'report (1)', newItemName: 'report (1)' },
        { ...folder, name: 'Photos (1)', plain_name: 'Photos (1)', newItemName: 'Photos (1)' },
      ],
      destinationFolderId: DESTINATION,
    });
    expect(mocks.popItemsToDelete).toHaveBeenCalledWith([file, folder]);
  });

  test('when moving with replace, then matched existing items are trashed before moving and every moved item leaves the pending deletion list', async () => {
    const matched = getDriveItemData({ uuid: 'matched', plainName: 'report', type: 'pdf' });
    const unmatched = getDriveItemData({ uuid: 'unmatched', plainName: 'other', type: 'pdf' });
    const existing = getDriveItemData({ uuid: 'existing', plainName: 'report', type: 'pdf' });
    const callOrder: string[] = [];
    mocks.moveItemsToTrash.mockImplementation(async () => callOrder.push('trash'));
    mocks.moveItemsThunk.mockImplementation(() => callOrder.push('move'));

    await resolve({
      operationType: 'move',
      operation: 'replace',
      items: [matched, unmatched],
      existingItems: [existing],
    });

    expect(mocks.moveItemsToTrash).toHaveBeenCalledWith([existing]);
    expect(mocks.moveItemsThunk).toHaveBeenCalledWith({ items: [matched], destinationFolderId: DESTINATION });
    expect(callOrder).toEqual(['trash', 'move']);
    expect(mocks.popItemsToDelete).toHaveBeenCalledWith([matched, unmatched]);
  });

  test('when uploading with keep, then folders upload with tracking, files upload with the duplicates check, and the folder is refreshed', async () => {
    const context = getContext({ maxUploadFileSize: 123, selectedWorkspace: { id: 'ws' } as never });
    const file = new File(['content'], 'report.pdf');
    const root = getRoot();

    await resolve({ operationType: 'upload', operation: 'keep', items: [file, root], existingItems: [] }, context);

    expect(mocks.uploadFoldersWithTracking).toHaveBeenCalledWith({
      payload: [{ root: { ...root }, currentFolderId: DESTINATION }],
      selectedWorkspace: { id: 'ws' },
      dispatch: context.dispatch,
      maxUploadFileSize: 123,
    });
    expect(mocks.uploadItemsThunk).toHaveBeenCalledWith({
      files: [file],
      parentFolderId: DESTINATION,
      options: { disableDuplicatedNamesCheck: false },
    });
    expect(mocks.fetchSortedFolderContentThunk).toHaveBeenCalledWith(DESTINATION);
    expect(mocks.popItemsToDelete).not.toHaveBeenCalled();
  });

  test('when uploading with replace and versioning is off, then only matched existing items are trashed and re-uploaded without the duplicates check', async () => {
    const matched = new File(['content'], 'report.pdf');
    const unmatched = new File(['content'], 'other.txt');
    const existing = getDriveItemData({ uuid: 'existing', plainName: 'report', type: 'pdf' });

    await resolve({
      operationType: 'upload',
      operation: 'replace',
      items: [matched, unmatched],
      existingItems: [existing],
    });

    expect(mocks.moveItemsToTrash).toHaveBeenCalledWith([existing]);
    expect(mocks.uploadFoldersWithTracking).not.toHaveBeenCalled();
    expect(mocks.uploadItemsThunk).toHaveBeenCalledWith({
      files: [matched],
      parentFolderId: DESTINATION,
      options: { disableDuplicatedNamesCheck: true },
    });
    expect(mocks.networkUploadFile).not.toHaveBeenCalled();
    expect(mocks.fetchSortedFolderContentThunk).toHaveBeenCalledWith(DESTINATION);
  });

  test('when uploading with replace and versioning is on, then allowed extensions become a new version while folders and other files are trashed and re-uploaded', async () => {
    const context = getContext({ isVersioningEnabled: true, selectedWorkspace: { id: 'ws' } as never });
    const pdf = new File(['content'], 'report.pdf');
    const image = new File(['content'], 'photo.png');
    const root = getRoot();
    const existingPdf = getDriveItemData({ uuid: 'existing-pdf', plainName: 'report', type: 'pdf' });
    const existingImage = getDriveItemData({ uuid: 'existing-png', plainName: 'photo', type: 'png' });
    const existingFolder = getDriveItemData({
      uuid: 'existing-folder',
      plainName: 'Photos',
      isFolder: true,
      type: 'pdf',
    });

    await resolve(
      {
        operationType: 'upload',
        operation: 'replace',
        items: [pdf, image, root],
        existingItems: [existingPdf, existingImage, existingFolder],
      },
      context,
    );

    expect(mocks.moveItemsToTrash).toHaveBeenCalledWith([existingImage, existingFolder]);
    expect(mocks.uploadFoldersWithTracking).toHaveBeenCalledWith(
      expect.objectContaining({ payload: [{ root: { ...root }, currentFolderId: DESTINATION }] }),
    );
    expect(mocks.uploadItemsThunk).toHaveBeenCalledWith(
      expect.objectContaining({ files: [image], options: { disableDuplicatedNamesCheck: true } }),
    );
    expect(mocks.getEnvironmentConfig).toHaveBeenCalledWith(true);
    expect(mocks.networkUploadFile).toHaveBeenCalledWith(
      'b',
      expect.objectContaining({ filecontent: pdf, filesize: pdf.size }),
      { taskId: expect.stringMatching(/^replace-existing-pdf-\d+$/) },
    );
    expect(mocks.replaceFile).toHaveBeenCalledWith('existing-pdf', { fileId: 'new-file-id', size: pdf.size });
    expect(mocks.invalidateCache).toHaveBeenCalledWith('existing-pdf');
    expect(mocks.fetchSortedFolderContentThunk).toHaveBeenCalledWith(DESTINATION);
  });

  test('when uploading with skip, then skipped files are ignored and skipped folders merge their new content into the existing folder recursively', async () => {
    const existingFile = new File(['a'], 'a.txt');
    const newFile = new File(['b'], 'b.txt');
    const nestedFile = new File(['c'], 'c.txt');
    const collidingSubfolder = getRoot('Sub', { childrenFiles: [nestedFile] });
    const newSubfolder = getRoot('New');
    const root = getRoot('Photos', {
      childrenFiles: [existingFile, newFile],
      childrenFolders: [collidingSubfolder, newSubfolder],
    });
    const existingPdf = getDriveItemData({ uuid: 'existing-pdf', plainName: 'report', type: 'pdf' });
    const existingFolder = getDriveItemData({ uuid: 'photos-uuid', plainName: 'Photos', isFolder: true });
    mocks.handleRepeatedUploadingFiles.mockImplementation(async (files: File[]) => ({
      unrepeatedItems: files.filter((file) => file !== existingFile),
      repeatedItems: [],
      existingItems: [],
    }));
    mocks.handleRepeatedUploadingFolders.mockImplementation(async (folders: IRoot[]) => ({
      unrepeatedItems: folders.filter((folder) => folder !== collidingSubfolder),
      repeatedItems: folders.filter((folder) => folder === collidingSubfolder),
      existingItems: folders.includes(collidingSubfolder) ? [{ uuid: 'sub-uuid', plainName: 'Sub' }] : [],
    }));

    await resolve({
      operationType: 'upload',
      operation: 'skip',
      items: [new File(['content'], 'report.pdf'), root],
      existingItems: [existingPdf, existingFolder],
    });

    expect(mocks.moveItemsToTrash).not.toHaveBeenCalled();
    expect(mocks.uploadItemsThunk).toHaveBeenCalledTimes(2);
    expect(mocks.uploadItemsThunk).toHaveBeenCalledWith({
      files: [newFile],
      parentFolderId: 'photos-uuid',
      options: { disableDuplicatedNamesCheck: true },
    });
    expect(mocks.uploadItemsThunk).toHaveBeenCalledWith({
      files: [nestedFile],
      parentFolderId: 'sub-uuid',
      options: { disableDuplicatedNamesCheck: true },
    });
    expect(mocks.uploadFoldersWithTracking).toHaveBeenCalledTimes(1);
    expect(mocks.uploadFoldersWithTracking).toHaveBeenCalledWith(
      expect.objectContaining({ payload: [{ root: { ...newSubfolder }, currentFolderId: 'photos-uuid' }] }),
    );
    expect(mocks.fetchSortedFolderContentThunk).toHaveBeenCalledWith(DESTINATION);
  });

  test('when several files are versioned, then they are replaced one at a time', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    mocks.replaceFile.mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      inFlight -= 1;
    });

    await resolve(
      {
        operationType: 'upload',
        operation: 'replace',
        items: [new File(['a'], 'a.pdf'), new File(['b'], 'b.pdf')],
        existingItems: [
          getDriveItemData({ uuid: 'a', plainName: 'a', type: 'pdf' }),
          getDriveItemData({ uuid: 'b', plainName: 'b', type: 'pdf' }),
        ],
      },
      getContext({ isVersioningEnabled: true }),
    );

    expect(mocks.replaceFile).toHaveBeenCalledTimes(2);
    expect(maxInFlight).toBe(1);
    expect(mocks.moveItemsToTrash).not.toHaveBeenCalled();
  });
});
