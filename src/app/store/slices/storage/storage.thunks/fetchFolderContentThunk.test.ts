import { beforeEach, describe, expect, vi, Mock, test } from 'vitest';
import { fetchPaginatedFolderContentThunk } from './fetchFolderContentThunk';
import { RootState } from '../../..';
import { SdkFactory } from '../../../../core/factory/sdk';
import errorService from 'services/error.service';
import workspacesSelectors from '../../workspaces/workspaces.selectors';
import { StorageState } from '../storage.model';

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
});
