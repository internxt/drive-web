import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { createFolder } from './createFolder';
import { CreateFolderResponse, EncryptionVersion } from '@internxt/sdk/dist/drive/storage/types';
import folderService from '../../../../drive/services/folder.service';
import tasksService from '../../../../tasks/services/tasks.service';
import errorService from '../../../../core/services/error.service';
import AppError from '../../../../core/types';
import { DriveFolderData } from '../../../../drive/types';

//StorageActions mock
vi.mock('..', () => ({
  default: {
    pushItems: vi.fn(),
  },
  storageActions: vi.fn(),
  storageSelectors: vi.fn(),
}));

vi.mock('../storage.thunks', () => ({
  default: {
    initializeThunk: vi.fn(),
    resetNamePathThunk: vi.fn(),
    uploadItemsThunk: vi.fn(),
    downloadItemsThunk: vi.fn(),
    downloadFileThunk: vi.fn(),
    downloadFolderThunk: vi.fn(),
    fetchPaginatedFolderContentThunk: vi.fn(),
    deleteItemsThunk: vi.fn(),
    goToFolderThunk: vi.fn(),
    uploadFolderThunk: vi.fn(),
    updateItemMetadataThunk: vi.fn(),
    fetchRecentsThunk: vi.fn(),
    createFolderThunk: vi.fn(),
    moveItemsThunk: vi.fn(),
    fetchDeletedThunk: vi.fn(),
    renameItemsThunk: vi.fn(),
    uploadSharedItemsThunk: vi.fn(),
  },
}));

vi.mock('../../../../drive/services/folder.service', () => ({
  default: {
    createFolder: vi.fn(),
    createFolderByUuid: vi.fn(),
    updateMetaData: vi.fn(),
    moveFolder: vi.fn(),
    moveFolderByUuid: vi.fn(),
    fetchFolderTree: vi.fn(),
    downloadFolderAsZip: vi.fn(),
    addAllFoldersToZip: vi.fn(),
    addAllFilesToZip: vi.fn(),
    downloadSharedFolderAsZip: vi.fn(),
  },
  createFilesIterator: vi.fn(),
  createFoldersIterator: vi.fn(),
}));

describe('checkCreateFolder', () => {
  const parentFolderId = 'parent-folder-id';
  const mockDispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create folder via folderService', async () => {
    const currentFolderId = 'currentFolderId';
    const mockFolder: CreateFolderResponse = {
      id: 0,
      name: 'Folder1',
      parentId: 0,
      plainName: 'Folder1',
      bucket: 'bucket',
      createdAt: new Date(),
      updatedAt: new Date(),
      creationTime: new Date(),
      deleted: false,
      deletedAt: null,
      encryptVersion: EncryptionVersion.Aes03,
      modificationTime: new Date(),
      parentUuid: parentFolderId,
      removed: false,
      removedAt: null,
      userId: 0,
      uuid: 'uuid',
    };

    (folderService.createFolderByUuid as Mock).mockReturnValue([Promise.resolve(mockFolder), { cancel: vi.fn() }]);
    vi.spyOn(tasksService, 'create').mockReturnValue('task-id');
    vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(errorService, 'castError').mockResolvedValue(new AppError('error'));

    const result = await createFolder(
      {
        folderName: 'Folder1',
        parentFolderId,
        options: { showErrors: true },
      },
      currentFolderId,
      null,
      { dispatch: mockDispatch },
    );

    const mockFolderNormalized: DriveFolderData = {
      ...mockFolder,
      name: 'Folder1',
      parent_id: mockFolder.parentId,
      user_id: mockFolder.userId,
      icon: null,
      iconId: null,
      icon_id: null,
      isFolder: true,
      color: null,
      encrypt_version: null,
      plain_name: mockFolder.plainName,
      deleted: false,
      createdAt: new Date(mockFolder.createdAt || '').toISOString(),
      updatedAt: new Date(mockFolder.updatedAt || '').toISOString(),
    };

    expect(mockFolderNormalized).toStrictEqual(result);
  });
});
