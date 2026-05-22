import { beforeEach, describe, expect, test, vi, Mock } from 'vitest';
import { fetchSortedFolderContentThunk } from './fetchSortedFolderContentThunk';
import { RootState } from '../../..';
import { SdkFactory } from '../../../../core/factory/sdk';
import errorService from 'services/error.service';
import workspacesSelectors from '../../workspaces/workspaces.selectors';
import { storageActions } from '..';
import { StorageState } from '../storage.model';
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
    setHasMoreDriveFolders: vi.fn(),
    setHasMoreDriveFiles: vi.fn(),
    setIsLoadingFolder: vi.fn(),
    setItems: vi.fn(),
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

    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFoldersByUuid.mockRejectedValue(mockError);

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
    expect(dispatch).toHaveBeenCalledWith(storageActions.setIsLoadingFolder({ folderId: mockFolderId, value: false }));
  });

  test('When fetching folder content in a personal drive, then folders and files are combined and dispatched together', async () => {
    const rawFolder = { uuid: 'folder-uuid-a', plainName: 'Documents', id: 1 };
    const rawFile = { uuid: 'file-uuid-b', plainName: 'report.pdf', id: 2 };
    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFoldersByUuid.mockResolvedValue([{ folders: [rawFolder] }]);
    mockStorageClient.getFolderFilesByUuid.mockResolvedValue([{ files: [rawFile] }]);
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
        items: expect.arrayContaining([
          expect.objectContaining({ uuid: 'folder-uuid-a', isFolder: true, name: 'Documents' }),
          expect.objectContaining({ uuid: 'file-uuid-b', isFolder: false, name: 'report.pdf' }),
        ]),
      }),
    );
  });

  test('When fetching folder content, then loading state is activated at start and deactivated in finally', async () => {
    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFoldersByUuid.mockResolvedValue([{ folders: [] }]);
    mockStorageClient.getFolderFilesByUuid.mockResolvedValue([{ files: [] }]);
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
    mockStorageClient.getFolderFoldersByUuid.mockResolvedValue([{ folders: [] }]);
    mockStorageClient.getFolderFilesByUuid.mockResolvedValue([{ files: [] }]);
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

  test('When sort field is "size", then folders are sorted by name in ascending order instead', async () => {
    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFoldersByUuid.mockResolvedValue([{ folders: [] }]);
    mockStorageClient.getFolderFilesByUuid.mockResolvedValue([{ files: [] }]);
    const mockWorkspaceClient = createMockWorkspaceClient();

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });
    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue(null);

    const getState = () =>
      createMockState({
        driveItemsSort: 'size',
        driveItemsOrder: 'desc',
      });

    await fetchSortedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(mockStorageClient.getFolderFoldersByUuid).toHaveBeenCalledWith(mockFolderId, 0, 50, 'name', 'ASC');
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

    expect(mockWorkspaceClient.getFolders).toHaveBeenCalledWith(mockWorkspaceId, mockFolderId, 0, 50, 'name', 'asc');
    expect(mockWorkspaceClient.getFiles).toHaveBeenCalledWith(mockWorkspaceId, mockFolderId, 0, 50, 'name', 'asc');
    expect(mockStorageClient.getFolderFoldersByUuid).not.toHaveBeenCalled();
    expect(mockStorageClient.getFolderFilesByUuid).not.toHaveBeenCalled();
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

  test('When fewer than 50 folders are returned, then the folder pagination is marked as complete', async () => {
    const fewFolders = Array.from({ length: 5 }, (_, i) => ({
      uuid: `folder-uuid-${i}`,
      plainName: `Folder ${i}`,
      id: i,
    }));
    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFoldersByUuid.mockResolvedValue([{ folders: fewFolders }]);
    mockStorageClient.getFolderFilesByUuid.mockResolvedValue([{ files: [] }]);
    const mockWorkspaceClient = createMockWorkspaceClient();

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });
    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue(null);

    const getState = () => createMockState();

    await fetchSortedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(dispatch).toHaveBeenCalledWith(
      storageActions.setHasMoreDriveFolders({ folderId: mockFolderId, status: false }),
    );
  });

  test('When fewer than 50 files are returned, then the file pagination is marked as complete', async () => {
    const fewFiles = Array.from({ length: 3 }, (_, i) => ({
      uuid: `file-uuid-${i}`,
      plainName: `file-${i}.txt`,
      id: i,
    }));
    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFoldersByUuid.mockResolvedValue([{ folders: [] }]);
    mockStorageClient.getFolderFilesByUuid.mockResolvedValue([{ files: fewFiles }]);
    const mockWorkspaceClient = createMockWorkspaceClient();

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });
    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue(null);

    const getState = () => createMockState();

    await fetchSortedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(dispatch).toHaveBeenCalledWith(
      storageActions.setHasMoreDriveFiles({ folderId: mockFolderId, status: false }),
    );
  });

  test('When the API throws, then loading is still deactivated in the finally block', async () => {
    const mockError = new Error('API failure');
    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFoldersByUuid.mockRejectedValue(mockError);
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

    expect(dispatch).toHaveBeenCalledWith(storageActions.setIsLoadingFolder({ folderId: mockFolderId, value: false }));
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
    mockStorageClient.getFolderFoldersByUuid.mockResolvedValue([{ folders: [rawFolder] }]);
    mockStorageClient.getFolderFilesByUuid.mockResolvedValue([{ files: [] }]);
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
