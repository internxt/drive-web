import { beforeEach, describe, expect, vi, Mock, test } from 'vitest';
import { fetchPaginatedFolderContentThunk } from './fetchFolderContentThunk';
import { RootState } from '../../..';
import { SdkFactory } from '../../../../core/factory/sdk';
import errorService from 'services/error.service';
import workspacesSelectors from '../../workspaces/workspaces.selectors';
import { StorageState } from '../storage.model';
import { storageActions } from '..';
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
    addItems: vi.fn(),
    setHasMoreDriveFolders: vi.fn(),
    addFolderFoldersLength: vi.fn(),
    setHasMoreDriveFiles: vi.fn(),
    addFolderFilesLength: vi.fn(),
    setDriveFoldersCursor: vi.fn(),
    setDriveFilesCursor: vi.fn(),
    setDriveItemsSort: vi.fn((payload: string) => ({ type: 'storage/setDriveItemsSort', payload })),
  },
}));

vi.mock('i18next', () => ({
  t: vi.fn((key) => key),
}));

vi.mock('./applyCachedFolderSizes', () => ({
  applyCachedFolderSizes: vi.fn(async (_, items) => items),
}));

describe('Thunk of fetch folder content', () => {
  const mockFolderId = 'folder-123';
  const mockWorkspaceId = 'workspace-456';
  const dispatch = vi.fn();

  const createMockStorageClient = () => ({
    getFolderFoldersByUuid: vi.fn(),
    getFolderFilesByUuid: vi.fn(),
    getFolderFoldersByUuidWithCursor: vi.fn(),
    getFolderFilesByUuidWithCursor: vi.fn(),
  });

  const createMockWorkspaceClient = () => ({
    getFolders: vi.fn(),
    getFiles: vi.fn(),
  });

  const createMockState = (overrides?: Partial<StorageState>): { storage: StorageState; [key: string]: unknown } => ({
    storage: {
      levels: {},
      hasMoreDriveFolders: {} as any,
      hasMoreDriveFiles: {} as any,
      driveFoldersCursor: {},
      driveFilesCursor: {},
      driveItemsSort: 'plainName',
      driveItemsOrder: 'ASC',
      loadingFolders: {} as any,
      ...overrides,
    } as StorageState,
  });

  const arrangeDrive = (selectedWorkspace: { workspace: { id: string } } | null, overrides?: Partial<StorageState>) => {
    const mockStorageClient = createMockStorageClient();
    const mockWorkspaceClient = createMockWorkspaceClient();
    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });
    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue(selectedWorkspace);
    const state = createMockState({ hasMoreDriveFolders: { [mockFolderId]: true } as any, ...overrides });
    return { mockStorageClient, mockWorkspaceClient, getState: vi.fn().mockReturnValue(state) };
  };

  const arrangePersonalDrive = (overrides?: Partial<StorageState>) => arrangeDrive(null, overrides);

  const arrangeWorkspaceDrive = (overrides?: Partial<StorageState>) =>
    arrangeDrive({ workspace: { id: mockWorkspaceId } }, overrides);

  const createFolders = (count: number) =>
    Array.from({ length: count }, (_, i) => ({ uuid: `folder-uuid-${i}`, plainName: `Folder ${i}`, id: i }));

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  test('When an error occurs during fetch, then an error indicating so is thrown', async () => {
    const mockError = new Error('Network error');
    const mockCastedError = { name: 'NetworkError', message: 'Network error', status: 500 };

    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFoldersByUuidWithCursor.mockReturnValue([Promise.reject(mockError)]);

    const mockWorkspaceClient = createMockWorkspaceClient();

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });

    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue(null);

    const castErrorSpy = vi.spyOn(errorService, 'castError').mockReturnValue(mockCastedError);
    const reportErrorSpy = vi.spyOn(errorService, 'reportError').mockReturnValue(undefined);

    const getState = () => createMockState();

    const result = await fetchPaginatedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(result.payload).toEqual(mockCastedError);
    expect(castErrorSpy).toHaveBeenCalledWith(mockError);
    expect(reportErrorSpy).toHaveBeenCalledWith(mockError);
  });

  test('When the first page of a personal folder is loaded by name, then folders are requested without a cursor and with sharings and favorites', async () => {
    const rawFolder = { uuid: 'folder-uuid-a', plainName: 'Documents', id: 1 };
    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFoldersByUuidWithCursor.mockReturnValue([
      Promise.resolve({ folders: [rawFolder], nextCursor: null }),
    ]);
    const mockWorkspaceClient = createMockWorkspaceClient();

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });
    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue(null);

    const getState = () =>
      createMockState({
        hasMoreDriveFolders: { [mockFolderId]: true } as any,
        hasMoreDriveFiles: { [mockFolderId]: false } as any,
      });

    await fetchPaginatedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(mockStorageClient.getFolderFoldersByUuidWithCursor).toHaveBeenCalledWith(mockFolderId, {
      order: 'ASC',
      limit: 50,
      cursor: undefined,
      withSharings: true,
      withFavorites: true,
    });
    expect(storageActions.addItems).toHaveBeenCalledWith(
      expect.objectContaining({
        folderId: mockFolderId,
        items: expect.arrayContaining([
          expect.objectContaining({ uuid: 'folder-uuid-a', name: 'Documents', isFolder: true }),
        ]),
      }),
    );
  });

  test('When all folders are loaded by name but files remain, then files are requested with sharings, favorites and thumbnails', async () => {
    const rawFile = { uuid: 'file-uuid-b', plainName: 'report.pdf', id: 2, size: '2048' };
    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFilesByUuidWithCursor.mockReturnValue([
      Promise.resolve({ files: [rawFile], nextCursor: null }),
    ]);
    const mockWorkspaceClient = createMockWorkspaceClient();

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });
    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue(null);

    const getState = () =>
      createMockState({
        hasMoreDriveFolders: { [mockFolderId]: false } as any,
        hasMoreDriveFiles: { [mockFolderId]: true } as any,
      });

    await fetchPaginatedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(mockStorageClient.getFolderFilesByUuidWithCursor).toHaveBeenCalledWith(mockFolderId, {
      order: 'ASC',
      limit: 50,
      cursor: undefined,
      withSharings: true,
      withFavorites: true,
      withThumbnails: true,
    });
    expect(storageActions.addItems).toHaveBeenCalledWith(
      expect.objectContaining({
        folderId: mockFolderId,
        items: expect.arrayContaining([
          expect.objectContaining({ uuid: 'file-uuid-b', name: 'report.pdf', isFolder: false, size: 2048 }),
        ]),
      }),
    );
  });

  test('When files come with camelCase thumbnails, then the stored files have snake_case thumbnails', async () => {
    const { mockStorageClient, getState } = arrangePersonalDrive({
      hasMoreDriveFolders: { [mockFolderId]: false } as any,
    });
    mockStorageClient.getFolderFilesByUuidWithCursor.mockReturnValue([
      Promise.resolve({ files: [{ uuid: 'file-uuid-b', thumbnails: [getThumbnailDto()] }], nextCursor: null }),
    ]);

    await fetchPaginatedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(storageActions.addItems).toHaveBeenCalledWith({
      folderId: mockFolderId,
      items: [expect.objectContaining({ uuid: 'file-uuid-b', thumbnails: [getDriveThumbnail()] })],
    });
  });

  test('When a file has size 0, then it is dispatched with size undefined', async () => {
    const rawFile = { uuid: 'file-uuid-zero', plainName: 'empty.txt', id: 3, size: 0 };
    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFilesByUuidWithCursor.mockReturnValue([
      Promise.resolve({ files: [rawFile], nextCursor: null }),
    ]);
    const mockWorkspaceClient = createMockWorkspaceClient();

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });
    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue(null);

    const getState = () =>
      createMockState({
        hasMoreDriveFolders: { [mockFolderId]: false } as any,
        hasMoreDriveFiles: { [mockFolderId]: true } as any,
      });

    await fetchPaginatedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(dispatch).toHaveBeenCalledWith(
      storageActions.addItems({
        folderId: mockFolderId,
        items: expect.arrayContaining([expect.objectContaining({ uuid: 'file-uuid-zero', size: undefined })]),
      }),
    );
  });

  test('When both folder and file pagination are exhausted, then no items are dispatched', async () => {
    const mockStorageClient = createMockStorageClient();
    const mockWorkspaceClient = createMockWorkspaceClient();

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });
    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue(null);

    const getState = () =>
      createMockState({
        hasMoreDriveFolders: { [mockFolderId]: false } as any,
        hasMoreDriveFiles: { [mockFolderId]: false } as any,
      });

    await fetchPaginatedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: expect.stringContaining('addItems') }));
    expect(mockStorageClient.getFolderFoldersByUuidWithCursor).not.toHaveBeenCalled();
    expect(mockStorageClient.getFolderFilesByUuidWithCursor).not.toHaveBeenCalled();
  });

  test('When a workspace is active, then workspace client is used for folder fetching', async () => {
    const rawFolder = { uuid: 'ws-folder-uuid', plainName: 'Team Folder', id: 10 };
    const mockStorageClient = createMockStorageClient();
    const mockWorkspaceClient = createMockWorkspaceClient();
    mockWorkspaceClient.getFolders.mockReturnValue([Promise.resolve({ result: [rawFolder] })]);

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });
    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue({
      workspace: { id: mockWorkspaceId },
    });

    const getState = () =>
      createMockState({
        hasMoreDriveFolders: { [mockFolderId]: true } as any,
        hasMoreDriveFiles: { [mockFolderId]: false } as any,
      });

    await fetchPaginatedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(mockWorkspaceClient.getFolders).toHaveBeenCalledWith(
      mockWorkspaceId,
      mockFolderId,
      0,
      50,
      'plainName',
      'ASC',
    );
    expect(mockStorageClient.getFolderFoldersByUuid).not.toHaveBeenCalled();
    expect(mockStorageClient.getFolderFoldersByUuidWithCursor).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith(
      storageActions.addItems({
        folderId: mockFolderId,
        items: expect.arrayContaining([
          expect.objectContaining({ uuid: 'ws-folder-uuid', name: 'Team Folder', isFolder: true }),
        ]),
      }),
    );
  });

  test('When a workspace is active, then workspace client is used for file fetching', async () => {
    const rawFile = { uuid: 'ws-file-uuid', plainName: 'budget.xlsx', id: 20, size: 4096 };
    const mockStorageClient = createMockStorageClient();
    const mockWorkspaceClient = createMockWorkspaceClient();
    mockWorkspaceClient.getFiles.mockReturnValue([Promise.resolve({ result: [rawFile] })]);

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });
    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue({
      workspace: { id: mockWorkspaceId },
    });

    const getState = () =>
      createMockState({
        hasMoreDriveFolders: { [mockFolderId]: false } as any,
        hasMoreDriveFiles: { [mockFolderId]: true } as any,
      });

    await fetchPaginatedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(mockWorkspaceClient.getFiles).toHaveBeenCalledWith(mockWorkspaceId, mockFolderId, 0, 50, 'plainName', 'ASC');
    expect(mockStorageClient.getFolderFilesByUuid).not.toHaveBeenCalled();
    expect(mockStorageClient.getFolderFilesByUuidWithCursor).not.toHaveBeenCalled();
  });

  test('When fewer than 50 folders are returned in a workspace, then the folder pagination is marked as complete', async () => {
    const { mockWorkspaceClient, getState } = arrangeWorkspaceDrive({
      hasMoreDriveFiles: { [mockFolderId]: false } as any,
    });
    mockWorkspaceClient.getFolders.mockReturnValue([Promise.resolve({ result: createFolders(10) })]);

    await fetchPaginatedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(storageActions.setHasMoreDriveFolders).toHaveBeenCalledWith({ folderId: mockFolderId, status: false });
  });

  test('When exactly 50 folders are returned in a workspace, then more folders may still be available', async () => {
    const { mockWorkspaceClient, getState } = arrangeWorkspaceDrive({
      hasMoreDriveFiles: { [mockFolderId]: false } as any,
    });
    mockWorkspaceClient.getFolders.mockReturnValue([Promise.resolve({ result: createFolders(50) })]);

    await fetchPaginatedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(storageActions.setHasMoreDriveFolders).toHaveBeenCalledWith({ folderId: mockFolderId, status: true });
  });

  describe('Personal drive opened with a Modified sort left by a workspace', () => {
    let mockStorageClient: ReturnType<typeof createMockStorageClient>;
    let arranged: ReturnType<typeof arrangePersonalDrive>;

    beforeEach(async () => {
      arranged = arrangePersonalDrive({ driveItemsSort: 'updatedAt' });
      mockStorageClient = arranged.mockStorageClient;
      mockStorageClient.getFolderFoldersByUuidWithCursor.mockReturnValue([
        Promise.resolve({ folders: [], nextCursor: null }),
      ]);

      await fetchPaginatedFolderContentThunk(mockFolderId)(dispatch, arranged.getState as () => RootState, {});
    });

    test('When the personal drive is opened with a Modified sort left by a workspace, then the request is still name-ordered by cursor', () => {
      expect(mockStorageClient.getFolderFoldersByUuid).not.toHaveBeenCalled();
      expect(mockStorageClient.getFolderFoldersByUuidWithCursor).toHaveBeenCalled();
    });

    test('When the personal drive is opened with a Modified sort left by a workspace, then the global driveItemsSort is not mutated', () => {
      expect(storageActions.setDriveItemsSort).not.toHaveBeenCalled();
      expect(arranged.getState().storage.driveItemsSort).toBe('updatedAt');
    });
  });

  describe('A workspace Modified sort does not leak into the personal drive (regression)', () => {
    test('When the personal drive folder content is fetched after a workspace was sorted by Modified, then the global driveItemsSort stays unchanged afterwards', async () => {
      const { mockStorageClient, getState } = arrangePersonalDrive({ driveItemsSort: 'updatedAt' });
      mockStorageClient.getFolderFoldersByUuidWithCursor.mockReturnValue([
        Promise.resolve({ folders: [], nextCursor: null }),
      ]);

      const trackingDispatch = vi.fn((action) => {
        if (action?.type === 'storage/setDriveItemsSort') {
          getState().storage.driveItemsSort = action.payload as StorageState['driveItemsSort'];
        }
        return action;
      });

      await fetchPaginatedFolderContentThunk(mockFolderId)(trackingDispatch, getState as () => RootState, {});

      expect(getState().storage.driveItemsSort).toBe('updatedAt');
    });
  });

  describe('Next pages by name', () => {
    describe('Next page of files', () => {
      let mockStorageClient: ReturnType<typeof createMockStorageClient>;

      beforeEach(async () => {
        const arranged = arrangePersonalDrive({
          hasMoreDriveFolders: { [mockFolderId]: false } as any,
          driveFilesCursor: { [mockFolderId]: 'cursor-1' },
        });
        mockStorageClient = arranged.mockStorageClient;
        mockStorageClient.getFolderFilesByUuidWithCursor.mockReturnValue([
          Promise.resolve({ files: [], nextCursor: 'cursor-2' }),
        ]);

        await fetchPaginatedFolderContentThunk(mockFolderId)(dispatch, arranged.getState as () => RootState, {});
      });

      test('When the next page of files is loaded, then the stored cursor is sent', () => {
        expect(mockStorageClient.getFolderFilesByUuidWithCursor).toHaveBeenCalledWith(
          mockFolderId,
          expect.objectContaining({ cursor: 'cursor-1' }),
        );
      });

      test('When the next page of files is loaded, then the returned cursor is stored', () => {
        expect(storageActions.setDriveFilesCursor).toHaveBeenCalledWith({ folderId: mockFolderId, cursor: 'cursor-2' });
      });

      test('When the next page of files returns a next cursor, then the folder still has more files', () => {
        expect(storageActions.setHasMoreDriveFiles).toHaveBeenCalledWith({ folderId: mockFolderId, status: true });
      });

      test('When the next page of files is loaded, then the offset files query is not used', () => {
        expect(mockStorageClient.getFolderFilesByUuid).not.toHaveBeenCalled();
      });
    });

    describe('Last page of folders', () => {
      beforeEach(async () => {
        const { mockStorageClient, getState } = arrangePersonalDrive();
        mockStorageClient.getFolderFoldersByUuidWithCursor.mockReturnValue([
          Promise.resolve({ folders: [], nextCursor: null }),
        ]);

        await fetchPaginatedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});
      });

      test('When the response has no next cursor, then the folder is marked as having no more folders', () => {
        expect(storageActions.setHasMoreDriveFolders).toHaveBeenCalledWith({ folderId: mockFolderId, status: false });
      });

      test('When the response has no next cursor, then a null folders cursor is stored', () => {
        expect(storageActions.setDriveFoldersCursor).toHaveBeenCalledWith({ folderId: mockFolderId, cursor: null });
      });
    });

    test('When the sort order changes while a page is loading, then the stale response is discarded entirely', async () => {
      const { mockStorageClient, getState } = arrangePersonalDrive();
      mockStorageClient.getFolderFoldersByUuidWithCursor.mockImplementation(() => {
        getState.mockReturnValue(createMockState({ driveItemsOrder: 'DESC' }));
        return [Promise.resolve({ folders: createFolders(50), nextCursor: 'cursor-asc' })];
      });

      await fetchPaginatedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

      expect(storageActions.addItems).not.toHaveBeenCalled();
      expect(storageActions.setDriveFoldersCursor).not.toHaveBeenCalled();
      expect(storageActions.setHasMoreDriveFolders).not.toHaveBeenCalled();
      expect(storageActions.addFolderFoldersLength).not.toHaveBeenCalled();
    });
  });

  test('When applying the folder cache enriches folders, then the enriched items are what gets dispatched', async () => {
    const { applyCachedFolderSizes } = await import('./applyCachedFolderSizes');
    const enrichedFolder = getDriveItemData({ uuid: 'folder-uuid', isFolder: true, size: 99999, sizeComputed: true });
    (applyCachedFolderSizes as Mock).mockResolvedValueOnce([enrichedFolder]);

    const rawFolder = { uuid: 'folder-uuid', plainName: 'Docs', id: 5 };
    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFoldersByUuidWithCursor.mockReturnValue([
      Promise.resolve({ folders: [rawFolder], nextCursor: null }),
    ]);
    const mockWorkspaceClient = createMockWorkspaceClient();

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });
    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue(null);

    const getState = () =>
      createMockState({
        hasMoreDriveFolders: { [mockFolderId]: true } as any,
        hasMoreDriveFiles: { [mockFolderId]: false } as any,
      });

    await fetchPaginatedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(dispatch).toHaveBeenCalledWith(
      storageActions.addItems({
        folderId: mockFolderId,
        items: [enrichedFolder],
      }),
    );
  });
});
