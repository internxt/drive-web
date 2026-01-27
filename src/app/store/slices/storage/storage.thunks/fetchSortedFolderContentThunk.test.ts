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

describe('Thunk of fetch sorted folder content', () => {
  const mockFolderId = 'folder-123';
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
});
