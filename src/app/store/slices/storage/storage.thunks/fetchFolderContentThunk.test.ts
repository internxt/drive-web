import { beforeEach, describe, expect, vi, Mock, test } from 'vitest';
import { fetchPaginatedFolderContentThunk } from './fetchFolderContentThunk';
import { RootState } from '../../..';
import { SdkFactory } from '../../../../core/factory/sdk';
import errorService from 'services/error.service';
import workspacesSelectors from '../../workspaces/workspaces.selectors';
import { StorageState } from '../storage.model';
import { storageActions } from '..';
import { getDriveItemData } from 'testUtils/fixtures/drive.fixtures';

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
      driveItemsSort: 'name',
      driveItemsOrder: 'asc',
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
    const mockCastedError = { name: 'NetworkError', message: 'Network error', status: 500 };

    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFoldersByUuid.mockReturnValue([Promise.reject(mockError)]);

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

  test('When more folders are pending in a personal drive, then folders are fetched and dispatched with correct shape', async () => {
    const rawFolder = { uuid: 'folder-uuid-a', plainName: 'Documents', id: 1 };
    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFoldersByUuid.mockReturnValue([Promise.resolve({ folders: [rawFolder] })]);
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

    expect(mockStorageClient.getFolderFoldersByUuid).toHaveBeenCalledWith(mockFolderId, 0, 50, 'name', 'asc');
    expect(dispatch).toHaveBeenCalledWith(
      storageActions.addItems({
        folderId: mockFolderId,
        items: expect.arrayContaining([
          expect.objectContaining({ uuid: 'folder-uuid-a', name: 'Documents', isFolder: true }),
        ]),
      }),
    );
  });

  test('When all folders are loaded but files remain, then files are fetched and dispatched with correct shape', async () => {
    const rawFile = { uuid: 'file-uuid-b', plainName: 'report.pdf', id: 2, size: 2048 };
    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFilesByUuid.mockReturnValue([Promise.resolve({ files: [rawFile] })]);
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

    expect(mockStorageClient.getFolderFilesByUuid).toHaveBeenCalledWith(mockFolderId, 0, 50, 'name', 'asc');
    expect(dispatch).toHaveBeenCalledWith(
      storageActions.addItems({
        folderId: mockFolderId,
        items: expect.arrayContaining([
          expect.objectContaining({ uuid: 'file-uuid-b', name: 'report.pdf', isFolder: false }),
        ]),
      }),
    );
  });

  test('When a file has size 0, then it is dispatched with size undefined', async () => {
    const rawFile = { uuid: 'file-uuid-zero', plainName: 'empty.txt', id: 3, size: 0 };
    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFilesByUuid.mockReturnValue([Promise.resolve({ files: [rawFile] })]);
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
    expect(mockStorageClient.getFolderFoldersByUuid).not.toHaveBeenCalled();
    expect(mockStorageClient.getFolderFilesByUuid).not.toHaveBeenCalled();
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

    expect(mockWorkspaceClient.getFolders).toHaveBeenCalledWith(mockWorkspaceId, mockFolderId, 0, 50, 'name', 'asc');
    expect(mockStorageClient.getFolderFoldersByUuid).not.toHaveBeenCalled();
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

    expect(mockWorkspaceClient.getFiles).toHaveBeenCalledWith(mockWorkspaceId, mockFolderId, 0, 50, 'name', 'asc');
    expect(mockStorageClient.getFolderFilesByUuid).not.toHaveBeenCalled();
  });

  test('When fewer than 50 folders are returned, then the folder pagination is marked as complete', async () => {
    const fewFolders = Array.from({ length: 10 }, (_, i) => ({
      uuid: `folder-uuid-${i}`,
      plainName: `Folder ${i}`,
      id: i,
    }));
    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFoldersByUuid.mockReturnValue([Promise.resolve({ folders: fewFolders })]);
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
      storageActions.setHasMoreDriveFolders({ folderId: mockFolderId, status: false }),
    );
  });

  test('When exactly 50 folders are returned, then more folders may still be available', async () => {
    const fullPage = Array.from({ length: 50 }, (_, i) => ({
      uuid: `folder-uuid-${i}`,
      plainName: `Folder ${i}`,
      id: i,
    }));
    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFoldersByUuid.mockReturnValue([Promise.resolve({ folders: fullPage })]);
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
      storageActions.setHasMoreDriveFolders({ folderId: mockFolderId, status: true }),
    );
  });

  test('When applying the folder cache enriches folders, then the enriched items are what gets dispatched', async () => {
    const { applyCachedFolderSizes } = await import('./applyCachedFolderSizes');
    const enrichedFolder = getDriveItemData({ uuid: 'folder-uuid', isFolder: true, size: 99999, sizeComputed: true });
    (applyCachedFolderSizes as Mock).mockResolvedValueOnce([enrichedFolder]);

    const rawFolder = { uuid: 'folder-uuid', plainName: 'Docs', id: 5 };
    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFoldersByUuid.mockReturnValue([Promise.resolve({ folders: [rawFolder] })]);
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
