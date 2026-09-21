import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getDriveItemData } from 'testUtils/fixtures/drive.fixtures';
import { DriveItemData } from 'app/drive/types';
import { IRoot } from 'app/store/slices/storage/types';
import { NameCollisionContext, ResolveCollisionParams, resolveCollision } from './nameCollision.actions';

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
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

const asMoveAction = (payload: unknown) => ({ type: 'move', payload });
const asPopAction = (payload: unknown) => ({ type: 'pop', payload });
const asUploadAction = (payload: unknown) => ({ type: 'upload', payload });
const asRefreshAction = (payload: unknown) => ({ type: 'refresh', payload });
const asInvalidateCacheAction = (payload: unknown) => ({ type: 'invalidateCache', payload });

const getRoot = (name = 'Photos', children: Partial<Pick<IRoot, 'childrenFiles' | 'childrenFolders'>> = {}): IRoot => ({
  name,
  folderId: null,
  childrenFiles: [],
  childrenFolders: [],
  fullPathEdited: `/${name}`,
  ...children,
});

const getContext = (overrides: Partial<NameCollisionContext> = {}): NameCollisionContext => ({
  dispatch: mocks.dispatch as unknown as NameCollisionContext['dispatch'],
  selectedWorkspace: null,
  maxUploadFileSize: 5000,
  isVersioningEnabled: false,
  ...overrides,
});

const asRenamed = (item: DriveItemData, name: string) => {
  const renamedItem = { ...item, name, plain_name: name, newItemName: name };
  return item.isFolder ? renamedItem : { ...renamedItem, plainName: name };
};

const expectMovesThenPop = (movedPayloads: unknown[], poppedItems: DriveItemData[]) =>
  expect(mocks.dispatch.mock.calls).toEqual([
    ...movedPayloads.map((payload) => [asMoveAction({ items: [payload], destinationFolderId: DESTINATION })]),
    [asPopAction(poppedItems)],
  ]);

const getNextFreeName = (name: string, takenItems: unknown[]) => `${name} (${takenItems.length})`;
const getNextFreeFolderName = async (name: string, takenItems: unknown[]) => getNextFreeName(name, takenItems);
const getNextFreeFilename = async (name: string, _type: string, takenItems: unknown[]) =>
  getNextFreeName(name, takenItems);

const findSameUniqueFilenameTwice = () =>
  mocks.getUniqueFilename
    .mockResolvedValueOnce('report (2)')
    .mockResolvedValueOnce('report (2)')
    .mockResolvedValueOnce('report (3)');

/**
 * Keeps the lookup of `heldName` pending until the lookup of another name starts, and returns the
 * order in which the lookups start and end.
 */
const holdFilenameLookupUntilOthersStart = (heldName: string): string[] => {
  const lookupOrder: string[] = [];
  let releaseHeldLookup = () => {};
  const untilOtherLookupStarts = new Promise<void>((release) => {
    releaseHeldLookup = release;
  });

  mocks.getUniqueFilename.mockImplementation(async (name: string) => {
    lookupOrder.push(`start ${name}`);
    if (name === heldName) {
      await untilOtherLookupStarts;
    } else {
      releaseHeldLookup();
    }
    lookupOrder.push(`end ${name}`);
    return `${name} (1)`;
  });

  return lookupOrder;
};

const failMovesOf = (failingItems: DriveItemData[]) =>
  mocks.dispatch.mockImplementation((action?: { payload?: { items?: DriveItemData[] } }) => ({
    unwrap: async () => {
      const hasFailingItem = action?.payload?.items?.some((item) => failingItems.includes(item));
      if (hasFailingItem) throw new Error('move failed');
    },
  }));

const succeedAllMoves = () => failMovesOf([]);

const resolve = (params: Omit<ResolveCollisionParams, 'destinationUuid'>, context = getContext()) =>
  resolveCollision({ ...params, destinationUuid: DESTINATION }, context);

/**
 * Mocks are reset by hand because the browser test project does not do it between tests.
 */
beforeEach(() => {
  vi.resetAllMocks();
  succeedAllMoves();
  mocks.checkDuplicatedFiles.mockResolvedValue({ duplicatedFilesResponse: ['file-dup'] });
  mocks.getUniqueFilename.mockResolvedValue('report (1)');
  mocks.checkFolderDuplicated.mockResolvedValue({ duplicatedFoldersResponse: ['folder-dup'] });
  mocks.getUniqueFolderName.mockResolvedValue('Photos (1)');
  mocks.moveItemsThunk.mockImplementation(asMoveAction);
  mocks.popItemsToDelete.mockImplementation(asPopAction);
  mocks.uploadItemsThunk.mockImplementation(asUploadAction);
  mocks.fetchSortedFolderContentThunk.mockImplementation(asRefreshAction);
  mocks.invalidateCache.mockImplementation(asInvalidateCacheAction);
  mocks.getEnvironmentConfig.mockResolvedValue({ bridgeUser: 'u', bridgePass: 'p', encryptionKey: 'k', bucketId: 'b' });
  mocks.networkUploadFile.mockReturnValue([Promise.resolve('new-file-id'), undefined]);
});

describe('resolveCollision', () => {
  test.each<[ResolveCollisionParams['operationType'], ResolveCollisionParams['operation'], unknown[][]]>([
    ['move', 'skip', []],
    ['upload', 'skip', []],
    ['move', 'keep', [[asPopAction([])]]],
    ['move', 'replace', [[asPopAction([])]]],
    ['upload', 'keep', []],
    ['upload', 'replace', []],
  ])(
    'when %s + %s has nothing to resolve, then nothing is moved, trashed or uploaded',
    async (operationType, operation, expectedDispatchCalls) => {
      const items = operation === 'skip' ? [getDriveItemData()] : [];

      await resolve({ operationType, operation, items, existingItems: [] });

      expect(mocks.moveItemsToTrash).not.toHaveBeenCalled();
      expect(mocks.uploadFoldersWithTracking).not.toHaveBeenCalled();
      expect(mocks.dispatch.mock.calls).toEqual(expectedDispatchCalls);
    },
  );

  test('when moving with keep, then items get a unique name and leave the pending deletion list', async () => {
    const file = getDriveItemData({ plainName: 'report', name: 'report', type: 'pdf', isFolder: false });
    const folder = getDriveItemData({ plainName: 'Photos', name: 'Photos', isFolder: true });

    await resolve({ operationType: 'move', operation: 'keep', items: [file, folder], existingItems: [] });

    expect(mocks.getUniqueFilename).toHaveBeenCalledWith('report', 'pdf', ['file-dup'], DESTINATION);
    expect(mocks.getUniqueFolderName).toHaveBeenCalledWith('Photos', ['folder-dup'], DESTINATION);
    expect(mocks.moveItemsToTrash).not.toHaveBeenCalled();
    expectMovesThenPop([asRenamed(file, 'report (1)'), asRenamed(folder, 'Photos (1)')], [file, folder]);
  });

  test('when two moved files share name and extension and the user keeps both, then they are moved under different unique names', async () => {
    const first = getDriveItemData({ uuid: 'first', plainName: 'report', name: 'report', type: 'pdf' });
    const second = getDriveItemData({ uuid: 'second', plainName: 'report', name: 'report', type: 'pdf' });
    mocks.getUniqueFilename.mockImplementation(getNextFreeFilename);

    await resolve({ operationType: 'move', operation: 'keep', items: [first, second], existingItems: [] });

    expectMovesThenPop([asRenamed(first, 'report (1)'), asRenamed(second, 'report (2)')], [first, second]);
  });

  test('when two moved folders share a name and the user keeps both, then they are moved under different unique names', async () => {
    const first = getDriveItemData({ uuid: 'first', plainName: 'Photos', name: 'Photos', isFolder: true });
    const second = getDriveItemData({ uuid: 'second', plainName: 'Photos', name: 'Photos', isFolder: true });
    const file = getDriveItemData({ uuid: 'file', plainName: 'Photos', name: 'Photos', type: 'pdf' });
    mocks.getUniqueFilename.mockImplementation(getNextFreeFilename);
    mocks.getUniqueFolderName.mockImplementation(getNextFreeFolderName);

    await resolve({ operationType: 'move', operation: 'keep', items: [first, file, second], existingItems: [] });

    expectMovesThenPop(
      [asRenamed(first, 'Photos (1)'), asRenamed(second, 'Photos (2)'), asRenamed(file, 'Photos (1)')],
      [first, second, file],
    );
  });

  test('when the unique name found for a kept file was already given to another kept file, then a new name is looked for among the names already given', async () => {
    const first = getDriveItemData({ uuid: 'first', plainName: 'report', name: 'report', type: 'pdf' });
    const second = getDriveItemData({ uuid: 'second', plainName: 'report', name: 'report', type: 'pdf' });
    const firstRenamed = expect.objectContaining({ uuid: 'first', plainName: 'report (2)' });
    findSameUniqueFilenameTwice();

    await resolve({ operationType: 'move', operation: 'keep', items: [first, second], existingItems: [] });

    expect(mocks.getUniqueFilename).toHaveBeenLastCalledWith(
      'report (2)',
      'pdf',
      ['file-dup', firstRenamed],
      DESTINATION,
    );
    expectMovesThenPop([asRenamed(first, 'report (2)'), asRenamed(second, 'report (3)')], [first, second]);
  });

  test('when two kept files whose names only differ in the number at the end are given the same unique name, then the second one gets a new name', async () => {
    const first = getDriveItemData({ uuid: 'first', plainName: 'report', name: 'report', type: 'pdf' });
    const second = getDriveItemData({ uuid: 'second', plainName: 'report (1)', name: 'report (1)', type: 'pdf' });
    findSameUniqueFilenameTwice();

    await resolve({ operationType: 'move', operation: 'keep', items: [first, second], existingItems: [] });

    expectMovesThenPop([asRenamed(first, 'report (2)'), asRenamed(second, 'report (3)')], [first, second]);
  });

  test('when kept items have different names, then their unique names are looked up in parallel', async () => {
    const report = getDriveItemData({ uuid: 'report', plainName: 'report', name: 'report', type: 'pdf' });
    const other = getDriveItemData({ uuid: 'other', plainName: 'other', name: 'other', type: 'pdf' });
    const lookupOrder = holdFilenameLookupUntilOthersStart('report');

    await resolve({ operationType: 'move', operation: 'keep', items: [report, other], existingItems: [] });

    expect(lookupOrder).toEqual(['start report', 'start other', 'end other', 'end report']);
  });

  test('when one move fails, then only the successfully moved items are removed from the items to delete', async () => {
    const moved = getDriveItemData({ uuid: 'moved', plainName: 'report', type: 'pdf' });
    const failed = getDriveItemData({ uuid: 'failed', plainName: 'other', type: 'pdf' });
    const existingItems = [
      getDriveItemData({ uuid: 'existing-report', plainName: 'report', type: 'pdf' }),
      getDriveItemData({ uuid: 'existing-other', plainName: 'other', type: 'pdf' }),
    ];
    failMovesOf([failed]);

    await resolve({ operationType: 'move', operation: 'replace', items: [moved, failed], existingItems });

    expectMovesThenPop([moved, failed], [moved]);
  });

  test('when two moved files collide with the same existing file and the user replaces, then the existing file is trashed once, the first item is moved with its own name and the second is moved with a unique name', async () => {
    const first = getDriveItemData({ uuid: 'first', plainName: 'report', name: 'report', type: 'pdf' });
    const second = getDriveItemData({ uuid: 'second', plainName: 'report', name: 'report', type: 'pdf' });
    const other = getDriveItemData({ uuid: 'other', plainName: 'other', name: 'other', type: 'pdf' });
    const existing = getDriveItemData({ uuid: 'existing', plainName: 'report', type: 'pdf' });
    const existingOther = getDriveItemData({ uuid: 'existing-other', plainName: 'other', type: 'pdf' });
    const callOrder: string[] = [];
    mocks.moveItemsThunk.mockImplementation((payload: { items: DriveItemData[] }) => {
      callOrder.push(`move ${payload.items[0].uuid}`);
      return asMoveAction(payload);
    });
    mocks.getUniqueFilename.mockImplementation(async () => {
      callOrder.push('rename');
      return 'report (1)';
    });

    await resolve({
      operationType: 'move',
      operation: 'replace',
      items: [first, second, other],
      existingItems: [existing, existingOther],
    });

    expect(mocks.moveItemsToTrash).toHaveBeenCalledTimes(1);
    expect(mocks.moveItemsToTrash).toHaveBeenCalledWith([existing, existingOther]);
    expect(callOrder).toEqual(['move first', 'move other', 'rename', 'move second']);
    expectMovesThenPop([first, other, asRenamed(second, 'report (1)')], [first, other, second]);
  });

  test('when moving with replace, then matched existing items are trashed first and unmatched items are moved under a unique name', async () => {
    const matched = getDriveItemData({ uuid: 'matched', plainName: 'report', type: 'pdf' });
    const unmatched = getDriveItemData({ uuid: 'unmatched', plainName: 'other', type: 'pdf' });
    const existing = getDriveItemData({ uuid: 'existing', plainName: 'report', type: 'pdf' });
    const callOrder: string[] = [];
    mocks.moveItemsToTrash.mockImplementation(async () => callOrder.push('trash'));
    mocks.moveItemsThunk.mockImplementation((payload: unknown) => {
      callOrder.push('move');
      return asMoveAction(payload);
    });
    mocks.getUniqueFilename.mockResolvedValue('other (1)');

    await resolve({
      operationType: 'move',
      operation: 'replace',
      items: [matched, unmatched],
      existingItems: [existing],
    });

    expect(mocks.moveItemsToTrash).toHaveBeenCalledWith([existing]);
    expect(callOrder).toEqual(['trash', 'move', 'move']);
    expectMovesThenPop([matched, asRenamed(unmatched, 'other (1)')], [matched, unmatched]);
  });

  test('when a moved file has no existing file left to replace and the user replaces, then nothing is trashed and the file is moved under a unique name', async () => {
    const file = getDriveItemData({ uuid: 'file', plainName: 'report', name: 'report', type: 'pdf' });

    await resolve({ operationType: 'move', operation: 'replace', items: [file], existingItems: [] });

    expect(mocks.moveItemsToTrash).not.toHaveBeenCalled();
    expectMovesThenPop([asRenamed(file, 'report (1)')], [file]);
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
    expect(mocks.dispatch.mock.calls).toEqual([
      [asUploadAction({ files: [file], parentFolderId: DESTINATION, options: { disableDuplicatedNamesCheck: false } })],
      [asRefreshAction(DESTINATION)],
    ]);
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
    expect(mocks.networkUploadFile).not.toHaveBeenCalled();
    expect(mocks.dispatch.mock.calls).toEqual([
      [
        asUploadAction({
          files: [matched],
          parentFolderId: DESTINATION,
          options: { disableDuplicatedNamesCheck: true },
        }),
      ],
      [asRefreshAction(DESTINATION)],
    ]);
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
    expect(mocks.getEnvironmentConfig).toHaveBeenCalledWith(true);
    expect(mocks.networkUploadFile).toHaveBeenCalledWith(
      'b',
      expect.objectContaining({ filecontent: pdf, filesize: pdf.size }),
      { taskId: expect.stringMatching(/^replace-existing-pdf-\d+$/) },
    );
    expect(mocks.replaceFile).toHaveBeenCalledWith('existing-pdf', { fileId: 'new-file-id', size: pdf.size });
    expect(mocks.dispatch.mock.calls).toEqual([
      [asUploadAction(expect.objectContaining({ files: [image], options: { disableDuplicatedNamesCheck: true } }))],
      [asInvalidateCacheAction('existing-pdf')],
      [asRefreshAction(DESTINATION)],
    ]);
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
    expect(mocks.uploadFoldersWithTracking).toHaveBeenCalledTimes(1);
    expect(mocks.uploadFoldersWithTracking).toHaveBeenCalledWith(
      expect.objectContaining({ payload: [{ root: { ...newSubfolder }, currentFolderId: 'photos-uuid' }] }),
    );
    expect(mocks.dispatch.mock.calls).toEqual([
      [
        asUploadAction({
          files: [newFile],
          parentFolderId: 'photos-uuid',
          options: { disableDuplicatedNamesCheck: true },
        }),
      ],
      [
        asUploadAction({
          files: [nestedFile],
          parentFolderId: 'sub-uuid',
          options: { disableDuplicatedNamesCheck: true },
        }),
      ],
      [asRefreshAction(DESTINATION)],
    ]);
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
    expect(mocks.dispatch.mock.calls).toEqual([
      [asInvalidateCacheAction('a')],
      [asInvalidateCacheAction('b')],
      [asRefreshAction(DESTINATION)],
    ]);
  });
});
