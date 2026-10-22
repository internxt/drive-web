import { beforeEach, describe, expect, test, vi, Mock } from 'vitest';
import { fetchSortedFolderContentThunk } from './fetchSortedFolderContentThunk';
import { RootState } from '../../..';
import { SdkFactory } from '../../../../core/factory/sdk';
import errorService from 'services/error.service';
import workspacesSelectors from '../../workspaces/workspaces.selectors';
import { storageActions } from '..';
import { StorageState } from '../storage.model';
import { getDriveItemData, getDriveThumbnail, getThumbnailDto } from 'testUtils/fixtures/drive.fixtures';

vi.mock('../../../../core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(),
  },
}));

vi.mock('../../workspaces/workspaces.selectors', () => ({
  default: {
    getSelectedWorkspace: vi.fn(),
  },
}));

vi.mock('..', () => ({
  storageActions: {
    setHasMoreDriveFolders: vi.fn(),
    setHasMoreDriveFiles: vi.fn(),
    setIsLoadingFolder: vi.fn(),
    setItems: vi.fn(),
    setDriveFoldersCursor: vi.fn(),
    setDriveFilesCursor: vi.fn(),
  },
}));

vi.mock('./applyCachedFolderSizes', () => ({
  applyCachedFolderSizes: vi.fn(async (_, items) => items),
}));

describe('Thunk of fetch sorted folder content', () => {
  const mockFolderId = 'folder-123';
  const mockWorkspaceId = 'workspace-456';
  const dispatch = vi.fn();

  const createMockStorageClient = () => ({
    getFolderFoldersByUuid: vi.fn(),
    getFolderFilesByUuid: vi.fn(),
    getFolderFoldersByUuidWithCursor: vi.fn(),
    getFolderFilesByUuidWithCursor: vi.fn(),
  });

  const resolveCursorPages = (
    mockStorageClient: ReturnType<typeof createMockStorageClient>,
    {
      folders = [] as object[],
      files = [] as object[],
      foldersCursor = null as string | null,
      filesCursor = null as string | null,
    } = {},
  ) => {
    mockStorageClient.getFolderFoldersByUuidWithCursor.mockReturnValue([
      Promise.resolve({ folders, nextCursor: foldersCursor }),
    ]);
    mockStorageClient.getFolderFilesByUuidWithCursor.mockReturnValue([
      Promise.resolve({ files, nextCursor: filesCursor }),
    ]);
  };

  const createMockWorkspaceClient = () => ({
    getFolders: vi.fn(),
    getFiles: vi.fn(),
  });

  const arrangeDrive = (selectedWorkspace: { workspace: { id: string } } | null) => {
    const mockStorageClient = createMockStorageClient();
    const mockWorkspaceClient = createMockWorkspaceClient();
    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });
    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue(selectedWorkspace);
    return { mockStorageClient, mockWorkspaceClient };
  };

  const arrangePersonalDrive = () => arrangeDrive(null);

  const arrangeWorkspaceDrive = ({ folders = [] as object[] } = {}) => {
    const { mockWorkspaceClient } = arrangeDrive({ workspace: { id: mockWorkspaceId } });
    mockWorkspaceClient.getFolders.mockReturnValue([Promise.resolve({ result: folders })]);
    mockWorkspaceClient.getFiles.mockReturnValue([Promise.resolve({ result: [] })]);
    return { mockWorkspaceClient };
  };

  const createMockState = (overrides?: Partial<StorageState>): { storage: StorageState; [key: string]: unknown } => ({
    storage: {
      levels: {},
      hasMoreDriveFolders: {} as any,
      hasMoreDriveFiles: {} as any,
      driveItemsSort: 'plainName',
      driveItemsOrder: 'ASC',
      loadingFolders: {} as any,
      ...overrides,
    } as StorageState,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  test('When an error occurs during fetch, then an error indicating so is thrown', async () => {
    const mockError = new Error('Network error');

    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFoldersByUuidWithCursor.mockReturnValue([Promise.reject(mockError)]);

    const mockWorkspaceClient = createMockWorkspaceClient();

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });

    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue(null);

    const reportErrorSpy = vi.spyOn(errorService, 'reportError').mockReturnValue(undefined);

    const getState = () => createMockState();

    try {
      await fetchSortedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});
    } catch (error) {
      // Expected to throw
    }

    expect(reportErrorSpy).toHaveBeenCalledWith(mockError);
  });

  test('When files come with camelCase thumbnails, then the stored files have snake_case thumbnails', async () => {
    const { mockStorageClient } = arrangePersonalDrive();
    resolveCursorPages(mockStorageClient, { files: [{ uuid: 'file-uuid-b', thumbnails: [getThumbnailDto()] }] });

    await fetchSortedFolderContentThunk(mockFolderId)(dispatch, () => createMockState() as RootState, {});

    expect(storageActions.setItems).toHaveBeenCalledWith({
      folderId: mockFolderId,
      items: [expect.objectContaining({ uuid: 'file-uuid-b', thumbnails: [getDriveThumbnail()] })],
    });
  });

  test('When fetching folder content in a personal drive, then folders and files are combined and dispatched together', async () => {
    const rawFolder = { uuid: 'folder-uuid-a', plainName: 'Documents', id: 1 };
    const rawFile = { uuid: 'file-uuid-b', plainName: 'report.pdf', id: 2 };
    const mockStorageClient = createMockStorageClient();
    resolveCursorPages(mockStorageClient, { folders: [rawFolder], files: [rawFile] });
    const mockWorkspaceClient = createMockWorkspaceClient();

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });
    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue(null);

    const getState = () => createMockState();

    await fetchSortedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(storageActions.setItems).toHaveBeenCalledWith({
      folderId: mockFolderId,
      items: [
        expect.objectContaining({ uuid: 'folder-uuid-a', isFolder: true, name: 'Documents' }),
        expect.objectContaining({ uuid: 'file-uuid-b', isFolder: false, name: 'report.pdf' }),
      ],
    });
  });

  describe('Refresh of a personal folder by name', () => {
    let mockStorageClient: ReturnType<typeof createMockStorageClient>;

    beforeEach(async () => {
      ({ mockStorageClient } = arrangePersonalDrive());
      resolveCursorPages(mockStorageClient, { foldersCursor: 'folders-next', filesCursor: 'files-next' });

      await fetchSortedFolderContentThunk(mockFolderId)(dispatch, () => createMockState() as RootState, {});
    });

    test('When a personal folder is refreshed by name, then the first folders page is requested with sharings and favorites', () => {
      expect(mockStorageClient.getFolderFoldersByUuidWithCursor).toHaveBeenCalledWith(mockFolderId, {
        order: 'ASC',
        limit: 50,
        withSharings: true,
        withFavorites: true,
      });
    });

    test('When a personal folder is refreshed by name, then the first files page is requested with sharings, favorites and thumbnails', () => {
      expect(mockStorageClient.getFolderFilesByUuidWithCursor).toHaveBeenCalledWith(mockFolderId, {
        order: 'ASC',
        limit: 50,
        withSharings: true,
        withFavorites: true,
        withThumbnails: true,
      });
    });

    test('When a personal folder is refreshed by name, then the next cursors of both pages are stored', () => {
      expect(storageActions.setDriveFoldersCursor).toHaveBeenCalledWith({
        folderId: mockFolderId,
        cursor: 'folders-next',
      });
      expect(storageActions.setDriveFilesCursor).toHaveBeenCalledWith({ folderId: mockFolderId, cursor: 'files-next' });
    });

    test('When the refreshed pages have a next cursor, then more folders and files are marked as available', () => {
      expect(storageActions.setHasMoreDriveFolders).toHaveBeenLastCalledWith({ folderId: mockFolderId, status: true });
      expect(storageActions.setHasMoreDriveFiles).toHaveBeenLastCalledWith({ folderId: mockFolderId, status: true });
    });

    test('When a personal folder is refreshed by name, then the old offset listing is not requested', () => {
      expect(mockStorageClient.getFolderFoldersByUuid).not.toHaveBeenCalled();
      expect(mockStorageClient.getFolderFilesByUuid).not.toHaveBeenCalled();
    });
  });

  test('When fetching folder content, then loading state is activated at start and deactivated in finally', async () => {
    const mockStorageClient = createMockStorageClient();
    resolveCursorPages(mockStorageClient);
    const mockWorkspaceClient = createMockWorkspaceClient();

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });
    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue(null);

    const getState = () => createMockState();

    await fetchSortedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    const dispatchCalls = dispatch.mock.calls.map((call) => call[0]);
    expect(dispatchCalls).toContainEqual(storageActions.setIsLoadingFolder({ folderId: mockFolderId, value: true }));
    expect(dispatchCalls).toContainEqual(storageActions.setIsLoadingFolder({ folderId: mockFolderId, value: false }));
  });

  test('When starting a fetch, then folder and file pagination flags are reset to available', async () => {
    const mockStorageClient = createMockStorageClient();
    resolveCursorPages(mockStorageClient);
    const mockWorkspaceClient = createMockWorkspaceClient();

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });
    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue(null);

    const getState = () => createMockState();

    await fetchSortedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    const dispatchCalls = dispatch.mock.calls.map((call) => call[0]);
    expect(dispatchCalls).toContainEqual(
      storageActions.setHasMoreDriveFolders({ folderId: mockFolderId, status: true }),
    );
    expect(dispatchCalls).toContainEqual(storageActions.setHasMoreDriveFiles({ folderId: mockFolderId, status: true }));
  });

  test('When a workspace folder is sorted by size, then its folders are sorted by name in ascending order instead', async () => {
    const { mockWorkspaceClient } = arrangeWorkspaceDrive();

    const getState = () =>
      createMockState({
        driveItemsSort: 'size',
        driveItemsOrder: 'desc',
      });

    await fetchSortedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(mockWorkspaceClient.getFolders).toHaveBeenCalledWith(mockWorkspaceId, mockFolderId, 0, 50, 'name', 'ASC');
  });

  test('When a workspace is active, then workspace clients are used for both folders and files', async () => {
    const rawFolder = { uuid: 'ws-folder-uuid', plainName: 'Team Folder', id: 10 };
    const rawFile = { uuid: 'ws-file-uuid', plainName: 'shared.docx', id: 20 };
    const mockStorageClient = createMockStorageClient();
    const mockWorkspaceClient = createMockWorkspaceClient();
    mockWorkspaceClient.getFolders.mockReturnValue([Promise.resolve({ result: [rawFolder] })]);
    mockWorkspaceClient.getFiles.mockReturnValue([Promise.resolve({ result: [rawFile] })]);

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });
    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue({
      workspace: { id: mockWorkspaceId },
    });

    const getState = () => createMockState();

    await fetchSortedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(mockWorkspaceClient.getFolders).toHaveBeenCalledWith(
      mockWorkspaceId,
      mockFolderId,
      0,
      50,
      'plainName',
      'ASC',
    );
    expect(mockWorkspaceClient.getFiles).toHaveBeenCalledWith(mockWorkspaceId, mockFolderId, 0, 50, 'plainName', 'ASC');
    expect(mockStorageClient.getFolderFoldersByUuid).not.toHaveBeenCalled();
    expect(mockStorageClient.getFolderFilesByUuid).not.toHaveBeenCalled();
    expect(mockStorageClient.getFolderFoldersByUuidWithCursor).not.toHaveBeenCalled();
    expect(mockStorageClient.getFolderFilesByUuidWithCursor).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith(
      storageActions.setItems({
        folderId: mockFolderId,
        items: expect.arrayContaining([
          expect.objectContaining({ uuid: 'ws-folder-uuid', isFolder: true }),
          expect.objectContaining({ uuid: 'ws-file-uuid', isFolder: false }),
        ]),
      }),
    );
  });

  test('When fewer than 50 folders are returned in a workspace, then the folder pagination is marked as complete', async () => {
    const fewFolders = Array.from({ length: 5 }, (_, i) => ({
      uuid: `folder-uuid-${i}`,
      plainName: `Folder ${i}`,
      id: i,
    }));
    arrangeWorkspaceDrive({ folders: fewFolders });

    const getState = () => createMockState({ driveItemsSort: 'updatedAt' });

    await fetchSortedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(storageActions.setHasMoreDriveFolders).toHaveBeenLastCalledWith({ folderId: mockFolderId, status: false });
  });

  test('When the sort order changes before the refresh responds, then its cursors are not stored', async () => {
    const { mockStorageClient } = arrangePersonalDrive();
    let state = createMockState();
    resolveCursorPages(mockStorageClient, { filesCursor: 'files-next' });
    mockStorageClient.getFolderFoldersByUuidWithCursor.mockImplementation(() => {
      state = createMockState({ driveItemsOrder: 'DESC' });
      return [Promise.resolve({ folders: [], nextCursor: 'folders-next' })];
    });

    await fetchSortedFolderContentThunk(mockFolderId)(dispatch, () => state as RootState, {});

    expect(storageActions.setDriveFoldersCursor).not.toHaveBeenCalled();
    expect(storageActions.setDriveFilesCursor).not.toHaveBeenCalled();
  });

  test('When the files page has no next cursor, then the file pagination is marked as complete', async () => {
    const fewFiles = Array.from({ length: 3 }, (_, i) => ({
      uuid: `file-uuid-${i}`,
      plainName: `file-${i}.txt`,
      id: i,
    }));
    const mockStorageClient = createMockStorageClient();
    resolveCursorPages(mockStorageClient, { files: fewFiles });
    const mockWorkspaceClient = createMockWorkspaceClient();

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });
    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue(null);

    const getState = () => createMockState();

    await fetchSortedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(storageActions.setHasMoreDriveFiles).toHaveBeenLastCalledWith({ folderId: mockFolderId, status: false });
  });

  test('When the API throws, then loading is still deactivated in the finally block', async () => {
    const mockError = new Error('API failure');
    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFoldersByUuidWithCursor.mockReturnValue([Promise.reject(mockError)]);
    const mockWorkspaceClient = createMockWorkspaceClient();

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });
    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue(null);
    vi.spyOn(errorService, 'reportError').mockReturnValue(undefined);

    const getState = () => createMockState();

    try {
      await fetchSortedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});
    } catch {
      // no-op
    }

    expect(storageActions.setIsLoadingFolder).toHaveBeenLastCalledWith({ folderId: mockFolderId, value: false });
  });

  test('When applying the folder cache enriches items, then the enriched list is what gets dispatched', async () => {
    const { applyCachedFolderSizes } = await import('./applyCachedFolderSizes');
    const enrichedFolder = getDriveItemData({
      uuid: 'enriched-folder',
      isFolder: true,
      size: 55555,
      sizeComputed: true,
    });
    (applyCachedFolderSizes as Mock).mockResolvedValueOnce([enrichedFolder]);

    const rawFolder = { uuid: 'enriched-folder', plainName: 'Important', id: 7 };
    const mockStorageClient = createMockStorageClient();
    resolveCursorPages(mockStorageClient, { folders: [rawFolder] });
    const mockWorkspaceClient = createMockWorkspaceClient();

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });
    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue(null);

    const getState = () => createMockState();

    await fetchSortedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(dispatch).toHaveBeenCalledWith(
      storageActions.setItems({
        folderId: mockFolderId,
        items: [enrichedFolder],
      }),
    );
  });
});
