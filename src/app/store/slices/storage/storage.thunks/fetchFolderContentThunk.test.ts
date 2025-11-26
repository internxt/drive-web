import { beforeEach, describe, expect, vi, Mock, test } from 'vitest';
import { fetchPaginatedFolderContentThunk } from './fetchFolderContentThunk';
import { RootState } from '../../..';
import { SdkFactory } from '../../../../core/factory/sdk';
import errorService from 'services/error.service';
import workspacesSelectors from '../../workspaces/workspaces.selectors';
import { storageActions } from '..';
import { StorageState } from '../storage.model';
import { DriveItemData } from 'app/drive/types';

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

  test('When fetching folders for personal storage, then should fetch and dispatch folders successfully', async () => {
    const mockFolders = [
      {
        plainName: 'Folder 1',
        id: 1,
        uuid: 'uuid-1',
      },
      {
        plainName: 'Folder 2',
        id: 2,
        uuid: 'uuid-2',
      },
    ];

    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFoldersByUuid.mockReturnValue([Promise.resolve({ folders: mockFolders })]);

    const mockWorkspaceClient = createMockWorkspaceClient();

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });

    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue(null);

    const getState = () => createMockState();

    await fetchPaginatedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(mockStorageClient.getFolderFoldersByUuid).toHaveBeenCalledWith(mockFolderId, 0, 50, 'name', 'asc');
    expect(dispatch).toHaveBeenCalledWith(
      storageActions.addItems({
        folderId: mockFolderId,
        items: expect.arrayContaining([
          expect.objectContaining({ name: 'Folder 1', isFolder: true }),
          expect.objectContaining({ name: 'Folder 2', isFolder: true }),
        ]),
      }),
    );
    expect(dispatch).toHaveBeenCalledWith(
      storageActions.setHasMoreDriveFolders({ folderId: mockFolderId, status: false }),
    );
    expect(dispatch).toHaveBeenCalledWith(
      storageActions.addFolderFoldersLength({ folderId: mockFolderId, foldersLength: 2 }),
    );
  });

  test('When sorting by "size" for folders, then should use "name" sort instead', async () => {
    const mockFolders = [{ plainName: 'Folder 1', id: 1, uuid: 'uuid-1' }];

    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFoldersByUuid.mockReturnValue([Promise.resolve({ folders: mockFolders })]);

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

    await fetchPaginatedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(mockStorageClient.getFolderFoldersByUuid).toHaveBeenCalledWith(mockFolderId, 0, 50, 'name', 'desc');
  });

  test('When receiving 50 or more folders, then should set the status of has more Drive folders to false', async () => {
    const mockFolders = Array.from({ length: 50 }, (_, i) => ({
      plainName: `Folder ${i}`,
      id: i,
      uuid: `uuid-${i}`,
    }));

    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFoldersByUuid.mockReturnValue([Promise.resolve({ folders: mockFolders })]);

    const mockWorkspaceClient = createMockWorkspaceClient();

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });

    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue(null);

    const getState = () => createMockState();

    await fetchPaginatedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(dispatch).toHaveBeenCalledWith(
      storageActions.setHasMoreDriveFolders({ folderId: mockFolderId, status: false }),
    );
  });

  test('When fetching folders for workspace storage, then should use workspace client, fetch and dispatch folders successfully', async () => {
    const mockFolders = [
      { plainName: 'Workspace Folder 1', id: 1, uuid: 'uuid-1' },
      { plainName: 'Workspace Folder 2', id: 2, uuid: 'uuid-2' },
    ];

    const mockStorageClient = createMockStorageClient();
    const mockWorkspaceClient = createMockWorkspaceClient();
    mockWorkspaceClient.getFolders.mockReturnValue([Promise.resolve({ result: mockFolders })]);

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });

    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue({
      workspace: { id: mockWorkspaceId },
    });

    const getState = () => createMockState();

    await fetchPaginatedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(mockWorkspaceClient.getFolders).toHaveBeenCalledWith(mockWorkspaceId, mockFolderId, 0, 50, 'name', 'asc');
    expect(dispatch).toHaveBeenCalledWith(
      storageActions.addItems({
        folderId: mockFolderId,
        items: expect.arrayContaining([
          expect.objectContaining({ name: 'Workspace Folder 1', isFolder: true }),
          expect.objectContaining({ name: 'Workspace Folder 2', isFolder: true }),
        ]),
      }),
    );
  });

  test('When fetching files after all folders are loaded in personal storage, then should fetch and dispatch files', async () => {
    const mockFiles = [
      { plainName: 'File 1.txt', id: 1, uuid: 'uuid-1', size: 1024 },
      { plainName: 'File 2.txt', id: 2, uuid: 'uuid-2', size: 2048 },
    ];

    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFilesByUuid.mockReturnValue([Promise.resolve({ files: mockFiles })]);

    const mockWorkspaceClient = createMockWorkspaceClient();

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });

    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue(null);

    const getState = () =>
      createMockState({
        hasMoreDriveFolders: { [mockFolderId as any]: false },
        hasMoreDriveFiles: { [mockFolderId as any]: true },
      });

    await fetchPaginatedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(mockStorageClient.getFolderFilesByUuid).toHaveBeenCalledWith(mockFolderId, 0, 50, 'name', 'asc');
    expect(dispatch).toHaveBeenCalledWith(
      storageActions.addItems({
        folderId: mockFolderId,
        items: expect.arrayContaining([
          expect.objectContaining({ name: 'File 1.txt', isFolder: false }),
          expect.objectContaining({ name: 'File 2.txt', isFolder: false }),
        ]),
      }),
    );
    expect(dispatch).toHaveBeenCalledWith(
      storageActions.setHasMoreDriveFiles({ folderId: mockFolderId, status: false }),
    );
    expect(dispatch).toHaveBeenCalledWith(
      storageActions.addFolderFilesLength({ folderId: mockFolderId, filesLength: 2 }),
    );
  });

  test('When fetching files after all folders are loaded in workspace storage, then should use workspace client', async () => {
    const mockFiles = [{ plainName: 'Workspace File 1.txt', id: 1, uuid: 'uuid-1', size: 1024 }];

    const mockStorageClient = createMockStorageClient();
    const mockWorkspaceClient = createMockWorkspaceClient();
    mockWorkspaceClient.getFiles.mockReturnValue([Promise.resolve({ result: mockFiles })]);

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });

    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue({
      workspace: { id: mockWorkspaceId },
    });

    const getState = () =>
      createMockState({
        hasMoreDriveFolders: { [mockFolderId as any]: false },
        hasMoreDriveFiles: { [mockFolderId as any]: true },
      });

    await fetchPaginatedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(mockWorkspaceClient.getFiles).toHaveBeenCalledWith(mockWorkspaceId, mockFolderId, 0, 50, 'name', 'asc');
    expect(dispatch).toHaveBeenCalledWith(
      storageActions.addItems({
        folderId: mockFolderId,
        items: expect.arrayContaining([expect.objectContaining({ name: 'Workspace File 1.txt', isFolder: false })]),
      }),
    );
  });

  test('When fetching files with size sort, then should use the correct sort parameter for files', async () => {
    const mockFiles = [{ plainName: 'File 1.txt', id: 1, uuid: 'uuid-1', size: 1024 }];

    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFilesByUuid.mockReturnValue([Promise.resolve({ files: mockFiles })]);

    const mockWorkspaceClient = createMockWorkspaceClient();

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });

    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue(null);

    const getState = () =>
      createMockState({
        hasMoreDriveFolders: { [mockFolderId as any]: false },
        hasMoreDriveFiles: { [mockFolderId as any]: true },
        driveItemsSort: 'size',
        driveItemsOrder: 'desc',
      });

    await fetchPaginatedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(mockStorageClient.getFolderFilesByUuid).toHaveBeenCalledWith(mockFolderId, 0, 50, 'size', 'desc');
  });

  test('When all folders and files are already loaded, then should return before fetching any item', async () => {
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

    expect(mockStorageClient.getFolderFoldersByUuid).not.toHaveBeenCalled();
    expect(mockStorageClient.getFolderFilesByUuid).not.toHaveBeenCalled();
    expect(mockWorkspaceClient.getFolders).not.toHaveBeenCalled();
    expect(mockWorkspaceClient.getFiles).not.toHaveBeenCalled();
  });

  test('When calculating offsets for pagination with existing folders, then should calculate correct folder offset', async () => {
    const existingItems: Partial<DriveItemData>[] = [
      { id: 1, isFolder: true, name: 'Folder 1' },
      { id: 2, isFolder: true, name: 'Folder 2' },
      { id: 3, isFolder: false, name: 'File 1' },
    ];

    const mockFolders = [{ plainName: 'Folder 3', id: 3, uuid: 'uuid-3' }];

    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFoldersByUuid.mockReturnValue([Promise.resolve({ folders: mockFolders })]);

    const mockWorkspaceClient = createMockWorkspaceClient();

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });

    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue(null);

    const getState = () =>
      createMockState({
        levels: { [mockFolderId]: existingItems as DriveItemData[] },
      });

    await fetchPaginatedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(mockStorageClient.getFolderFoldersByUuid).toHaveBeenCalledWith(mockFolderId, 2, 50, 'name', 'asc');
  });

  test('When calculating offsets for pagination with existing files, then should calculate correct file offset', async () => {
    const existingItems: Partial<DriveItemData>[] = [
      { id: 1, isFolder: true, name: 'Folder 1' },
      { id: 2, isFolder: false, name: 'File 1' },
      { id: 3, isFolder: false, name: 'File 2' },
      { id: 4, isFolder: false, name: 'File 3' },
    ];

    const mockFiles = [{ plainName: 'File 4.txt', id: 4, uuid: 'uuid-4', size: 1024 }];

    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFilesByUuid.mockReturnValue([Promise.resolve({ files: mockFiles })]);

    const mockWorkspaceClient = createMockWorkspaceClient();

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });

    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue(null);

    const getState = () =>
      createMockState({
        levels: { [mockFolderId]: existingItems as DriveItemData[] },
        hasMoreDriveFolders: { [mockFolderId as any]: false },
        hasMoreDriveFiles: { [mockFolderId as any]: true },
      });

    await fetchPaginatedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(mockStorageClient.getFolderFilesByUuid).toHaveBeenCalledWith(mockFolderId, 3, 50, 'name', 'asc');
  });

  test('When an error occurs during fetch, then an error indicating so is thrown', async () => {
    const mockError = new Error('Network error');
    const mockCastedError = { message: 'Network error', status: 500 };

    const mockStorageClient = createMockStorageClient();
    mockStorageClient.getFolderFoldersByUuid.mockReturnValue([Promise.reject(mockError)]);

    const mockWorkspaceClient = createMockWorkspaceClient();

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
      createWorkspacesClient: () => mockWorkspaceClient,
    });

    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue(null);

    (errorService.reportError as Mock).mockReturnValue(undefined);
    (errorService.castError as Mock).mockReturnValue(mockCastedError);

    const getState = () => createMockState();

    const result = await fetchPaginatedFolderContentThunk(mockFolderId)(dispatch, getState as () => RootState, {});

    expect(result.payload).toEqual(mockCastedError);
    expect(errorService.reportError).toHaveBeenCalledWith(mockError);
    expect(errorService.castError).toHaveBeenCalledWith(mockError);
  });
});
