import { afterEach, beforeEach, describe, expect, Mock, test, vi } from 'vitest';
import { WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { WORKSPACE_FOLDER_REPLICA_DELAY_MS } from 'app/network/networkConstants';
import { checkFolderDuplicated } from 'app/store/slices/storage/folderUtils/checkFolderDuplicated';
import { createFolder } from 'app/store/slices/storage/folderUtils/createFolder';
import { findOrCreateFolderPath } from 'app/store/slices/storage/folderUtils/findOrCreateFolderPath';

vi.mock('app/store/slices/storage/folderUtils/checkFolderDuplicated', () => ({ checkFolderDuplicated: vi.fn() }));
vi.mock('app/store/slices/storage/folderUtils/createFolder', () => ({ createFolder: vi.fn() }));

const nearestFolderId = 'nearest-uuid';
const workspace = { workspace: { id: 'workspace-id' } } as WorkspaceData;

const resolvePath = (folderPath: string[], selectedWorkspace: WorkspaceData | null = null) =>
  findOrCreateFolderPath({
    parentFolderId: nearestFolderId,
    folderPath,
    relatedTaskId: 'folder-task',
    currentFolderId: 'current-folder',
    selectedWorkspace,
    dispatch: vi.fn(),
  });

const newFolder = (folderId: string) => ({ folderId, isNewFolder: true });

const createdFolders = () =>
  (createFolder as Mock).mock.calls.map(([{ parentFolderId, folderName }]) => [parentFolderId, folderName]);

const existingFolders = (...folders: { plainName: string; uuid: string }[]) => ({
  duplicatedFoldersResponse: folders,
  foldersWithDuplicates: [],
  foldersWithoutDuplicates: [],
});

describe('findOrCreateFolderPath', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (checkFolderDuplicated as Mock).mockResolvedValue(existingFolders());
    (createFolder as Mock).mockImplementation(async ({ folderName }) => ({ uuid: `${folderName}-uuid` }));
  });

  test('when none of the folders exist, then each one is created inside the previous one and the last one is returned', async () => {
    await expect(resolvePath(['Broken', 'Deep'])).resolves.toEqual(newFolder('Deep-uuid'));

    expect(createdFolders()).toEqual([
      [nearestFolderId, 'Broken'],
      ['Broken-uuid', 'Deep'],
    ]);
  });

  test('when a folder of the path has to be created, then the folders below it are created without checking if they exist', async () => {
    await resolvePath(['Broken', 'Deep']);

    expect(checkFolderDuplicated).toHaveBeenCalledOnce();
    expect(checkFolderDuplicated).toHaveBeenCalledWith(expect.anything(), nearestFolderId);
  });

  test('when the folder already exists, then it is returned as not new without creating it', async () => {
    (checkFolderDuplicated as Mock).mockResolvedValueOnce(
      existingFolders({ plainName: 'Broken', uuid: 'existing-broken-uuid' }),
    );

    await expect(resolvePath(['Broken'])).resolves.toEqual({ folderId: 'existing-broken-uuid', isNewFolder: false });

    expect(createdFolders()).toEqual([]);
  });

  test('when a folder of the path already exists, then it is reused and only the missing ones are created', async () => {
    (checkFolderDuplicated as Mock).mockResolvedValueOnce(
      existingFolders({ plainName: 'Broken', uuid: 'existing-broken-uuid' }),
    );

    await expect(resolvePath(['Broken', 'Deep'])).resolves.toEqual(newFolder('Deep-uuid'));

    expect(createdFolders()).toEqual([['existing-broken-uuid', 'Deep']]);
  });

  test('when several retries need the same missing folders at once, then each folder is created only once', async () => {
    const folderIds = await Promise.all([resolvePath(['Broken', 'Deep']), resolvePath(['Broken', 'Deep'])]);

    expect(folderIds).toEqual([newFolder('Deep-uuid'), newFolder('Deep-uuid')]);
    expect(createdFolders()).toEqual([
      [nearestFolderId, 'Broken'],
      ['Broken-uuid', 'Deep'],
    ]);
  });

  test('when a folder cannot be created, then the failure is passed on and the next attempt tries to create it again', async () => {
    (createFolder as Mock).mockRejectedValueOnce(new Error('connection dropped'));

    await expect(resolvePath(['Broken'])).rejects.toThrow('connection dropped');
    await expect(resolvePath(['Broken'])).resolves.toEqual(newFolder('Broken-uuid'));
  });

  describe('when waiting for the folder to be ready', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test('when a workspace is selected, then the folder is returned only after the replica delay', async () => {
      let resolvedFolderId: string | undefined;
      resolvePath(['Broken'], workspace).then(({ folderId }) => (resolvedFolderId = folderId));

      await vi.advanceTimersByTimeAsync(WORKSPACE_FOLDER_REPLICA_DELAY_MS - 1);
      expect(resolvedFolderId).toBeUndefined();

      await vi.advanceTimersByTimeAsync(1);
      expect(resolvedFolderId).toBe('Broken-uuid');
    });

    test('when no workspace is selected, then the folder is returned without waiting', async () => {
      let resolvedFolderId: string | undefined;
      resolvePath(['Broken']).then(({ folderId }) => (resolvedFolderId = folderId));

      await vi.advanceTimersByTimeAsync(0);
      expect(resolvedFolderId).toBe('Broken-uuid');
    });
  });
});
