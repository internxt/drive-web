import { beforeEach, describe, expect, test, vi, Mock } from 'vitest';
import { fetchSortedFolderContentThunk } from './fetchSortedFolderContentThunk';
import { RootState } from '../../..';
import { SdkFactory } from '../../../../core/factory/sdk';
import errorService from 'services/error.service';
import workspacesSelectors from '../../workspaces/workspaces.selectors';
import { storageActions } from '..';
import { StorageState } from '../storage.model';

vi.mock('../../../../core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(),
  },
}));

vi.mock('services/error.service', () => ({
  default: {
    castError: vi.fn().mockImplementation((e) => e),
    reportError: vi.fn(),
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

vi.mock('i18next', () => ({
  t: vi.fn((key) => key),
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

  test('When fetching sorted content for personal storage, then should fetch folders and files and dispatch them', async () => {
    const mockFolders = [
      { plainName: 'Folder 1', id: 1, uuid: 'uuid-1' },
      { plainName: 'Folder 2', id: 2, uuid: 'uuid-2' },
    ];

    const mockFiles = [
      { plainName: 'File 1.txt', id: 3, uuid: 'uuid-3', size: 1024 },
      { plainName: 'File 2.txt', id: 4, uuid: 'uuid-4', size: 2048 },
    ];

    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFoldersByUuid.mockResolvedValue([Promise.resolve({ folders: mockFolders })]);
    mockStorageClient.getFolderFilesByUuid.mockResolvedValue([Promise.resolve({ files: mockFiles })]);

    const mockWorkspaceClient = createMockWorkspaceClient();

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });

    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue(null);

    const getState = () => createMockState();

    await fetchSortedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(dispatch).toHaveBeenCalledWith(
      storageActions.setHasMoreDriveFolders({ folderId: mockFolderId, status: true }),
    );
    expect(dispatch).toHaveBeenCalledWith(
      storageActions.setHasMoreDriveFiles({ folderId: mockFolderId, status: true }),
    );
    expect(dispatch).toHaveBeenCalledWith(storageActions.setIsLoadingFolder({ folderId: mockFolderId, value: true }));
    expect(dispatch).toHaveBeenCalledWith(storageActions.setItems({ folderId: mockFolderId, items: [] }));
    expect(dispatch).toHaveBeenCalledWith(
      storageActions.setItems({
        folderId: mockFolderId,
        items: expect.arrayContaining([
          expect.objectContaining({ name: 'Folder 1', isFolder: true }),
          expect.objectContaining({ name: 'Folder 2', isFolder: true }),
          expect.objectContaining({ name: 'File 1.txt', isFolder: false }),
          expect.objectContaining({ name: 'File 2.txt', isFolder: false }),
        ]),
      }),
    );
    expect(dispatch).toHaveBeenCalledWith(storageActions.setIsLoadingFolder({ folderId: mockFolderId, value: false }));
  });

  test('When sorting by "size" for folders, then should use "name" sort with "ASC" order instead', async () => {
    const mockFolders = [{ plainName: 'Folder 1', id: 1, uuid: 'uuid-1' }];
    const mockFiles = [{ plainName: 'File 1.txt', id: 2, uuid: 'uuid-2', size: 1024 }];

    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFoldersByUuid.mockResolvedValue([Promise.resolve({ folders: mockFolders })]);
    mockStorageClient.getFolderFilesByUuid.mockResolvedValue([Promise.resolve({ files: mockFiles })]);

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

    const folderPromise = await mockStorageClient.getFolderFoldersByUuid.mock.results[0].value;
    expect(folderPromise).toBeDefined();
  });

  test('When receiving 50 or more folders, then should set the status of has more Drive folders to false', async () => {
    const mockFolders = Array.from({ length: 50 }, (_, i) => ({
      plainName: `Folder ${i}`,
      id: i,
      uuid: `uuid-${i}`,
    }));

    const mockFiles = [{ plainName: 'File 1.txt', id: 100, uuid: 'uuid-100', size: 1024 }];

    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFoldersByUuid.mockResolvedValue([Promise.resolve({ folders: mockFolders })]);
    mockStorageClient.getFolderFilesByUuid.mockResolvedValue([Promise.resolve({ files: mockFiles })]);

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

  test('When receiving 50 or more files, then should set the status of has more Drive files to false', async () => {
    const mockFolders = [{ plainName: 'Folder 1', id: 1, uuid: 'uuid-1' }];

    const mockFiles = Array.from({ length: 50 }, (_, i) => ({
      plainName: `File ${i}.txt`,
      id: i + 100,
      uuid: `uuid-${i + 100}`,
      size: 1024,
    }));

    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFoldersByUuid.mockResolvedValue([Promise.resolve({ folders: mockFolders })]);
    mockStorageClient.getFolderFilesByUuid.mockResolvedValue([Promise.resolve({ files: mockFiles })]);

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

  test('When fetching sorted content for workspace storage, then should use workspace client for both folders and files', async () => {
    const mockFolders = [
      { plainName: 'Workspace Folder 1', id: 1, uuid: 'uuid-1' },
      { plainName: 'Workspace Folder 2', id: 2, uuid: 'uuid-2' },
    ];

    const mockFiles = [{ plainName: 'Workspace File 1.txt', id: 3, uuid: 'uuid-3', size: 1024 }];

    const mockStorageClient = createMockStorageClient();
    const mockWorkspaceClient = createMockWorkspaceClient();
    mockWorkspaceClient.getFolders.mockReturnValue([Promise.resolve({ result: mockFolders })]);
    mockWorkspaceClient.getFiles.mockReturnValue([Promise.resolve({ result: mockFiles })]);

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
    expect(dispatch).toHaveBeenCalledWith(
      storageActions.setItems({
        folderId: mockFolderId,
        items: expect.arrayContaining([
          expect.objectContaining({ name: 'Workspace Folder 1', isFolder: true }),
          expect.objectContaining({ name: 'Workspace Folder 2', isFolder: true }),
          expect.objectContaining({ name: 'Workspace File 1.txt', isFolder: false }),
        ]),
      }),
    );
  });

  test('When fetching with less than 50 folders, then should set the status of has more Drive folders to false', async () => {
    const mockFolders = [
      { plainName: 'Folder 1', id: 1, uuid: 'uuid-1' },
      { plainName: 'Folder 2', id: 2, uuid: 'uuid-2' },
    ];

    const mockFiles = [{ plainName: 'File 1.txt', id: 3, uuid: 'uuid-3', size: 1024 }];

    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFoldersByUuid.mockResolvedValue([Promise.resolve({ folders: mockFolders })]);
    mockStorageClient.getFolderFilesByUuid.mockResolvedValue([Promise.resolve({ files: mockFiles })]);

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

  test('When fetching with less than 50 files, then should set the status of has more Drive files to false', async () => {
    const mockFolders = [{ plainName: 'Folder 1', id: 1, uuid: 'uuid-1' }];

    const mockFiles = [
      { plainName: 'File 1.txt', id: 2, uuid: 'uuid-2', size: 1024 },
      { plainName: 'File 2.txt', id: 3, uuid: 'uuid-3', size: 2048 },
    ];

    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFoldersByUuid.mockResolvedValue([Promise.resolve({ folders: mockFolders })]);
    mockStorageClient.getFolderFilesByUuid.mockResolvedValue([Promise.resolve({ files: mockFiles })]);

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

  test('When combining folders and files, then should concatenate folders first and files second', async () => {
    const mockFolders = [
      { plainName: 'A Folder', id: 1, uuid: 'uuid-1' },
      { plainName: 'B Folder', id: 2, uuid: 'uuid-2' },
    ];

    const mockFiles = [
      { plainName: 'C File.txt', id: 3, uuid: 'uuid-3', size: 1024 },
      { plainName: 'D File.txt', id: 4, uuid: 'uuid-4', size: 2048 },
    ];

    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFoldersByUuid.mockResolvedValue([Promise.resolve({ folders: mockFolders })]);
    mockStorageClient.getFolderFilesByUuid.mockResolvedValue([Promise.resolve({ files: mockFiles })]);

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
          expect.objectContaining({ name: 'A Folder', isFolder: true }),
          expect.objectContaining({ name: 'B Folder', isFolder: true }),
          expect.objectContaining({ name: 'C File.txt', isFolder: false }),
          expect.objectContaining({ name: 'D File.txt', isFolder: false }),
        ]),
      }),
    );
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

    (errorService.reportError as Mock).mockReturnValue(undefined);

    const getState = () => createMockState();

    try {
      await fetchSortedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});
    } catch (error) {
      // Expected to throw
    }

    expect(errorService.reportError).toHaveBeenCalledWith(mockError);
    expect(dispatch).toHaveBeenCalledWith(storageActions.setIsLoadingFolder({ folderId: mockFolderId, value: false }));
  });
});
