import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import tasksService from '../../../../tasks/services/tasks.service';
import errorService from '../../../../core/services/error.service';
import AppError from '../../../../core/types';
import { DriveFolderData } from '../../../../drive/types';
import { uploadMultipleFolder } from './uploadFolders';
import { createFolder } from './createFolder';

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
  storageExtraReducers: vi.fn(),
}));

vi.mock('../../plan', () => ({
  default: {
    initializeThunk: vi.fn(),
    fetchLimitThunk: vi.fn(),
    fetchUsageThunk: vi.fn(),
    fetchSubscriptionThunk: vi.fn(),
    fetchBusinessLimitUsageThunk: vi.fn(),
  },
  planThunks: vi.fn(),
}));

vi.mock('app/drive/services/download.service/downloadFolder', () => ({
  default: {
    fetchFileBlob: vi.fn(),
    downloadFileFromBlob: vi.fn(),
    downloadFile: vi.fn(),
    downloadFolder: vi.fn(),
    downloadBackup: vi.fn(),
  },
}));

vi.mock('./createFolder', () => ({
  createFolder: vi.fn(),
}));

describe('checkUploadFolders', () => {
  const mockDispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should upload folder using an async queue', async () => {
    const mockFolder: DriveFolderData = {
      id: 0,
      uuid: 'uuid',
      name: 'Folder1',
      bucket: 'bucket',
      parentId: 0,
      parent_id: 0,
      parentUuid: 'parentUuid',
      userId: 0,
      user_id: 0,
      icon: null,
      iconId: null,
      icon_id: null,
      isFolder: true,
      color: null,
      encrypt_version: null,
      plain_name: 'Folder1',
      deleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const createFolderSpy = (createFolder as Mock).mockResolvedValueOnce(mockFolder);

    vi.spyOn(tasksService, 'create').mockReturnValue('task-id');
    vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(errorService, 'castError').mockResolvedValue(new AppError('error'));

    await uploadMultipleFolder(
      [
        {
          currentFolderId: 'currentFolderId',
          root: {
            folderId: mockFolder.uuid,
            childrenFiles: [],
            childrenFolders: [],
            name: mockFolder.name,
            fullPathEdited: 'path1',
          },
          options: {
            taskId: 'task-id',
          },
        },
      ],
      null,
      { dispatch: mockDispatch },
    );

    expect(createFolderSpy).toHaveBeenCalledOnce();
  });

  it('should upload multiple folders using an async queue', async () => {
    const mockParentFolder: DriveFolderData = {
      id: 1,
      uuid: 'uuid1',
      name: 'Folder1',
      bucket: 'bucket',
      parentId: 0,
      parent_id: 0,
      parentUuid: 'parentUuid',
      userId: 0,
      user_id: 0,
      icon: null,
      iconId: null,
      icon_id: null,
      isFolder: true,
      color: null,
      encrypt_version: null,
      plain_name: 'Folder1',
      deleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const mockChildFolder: DriveFolderData = {
      id: 2,
      uuid: 'uuid2',
      name: 'Folder2',
      bucket: 'bucket',
      parentId: 1,
      parent_id: 1,
      parentUuid: 'uuid1',
      userId: 0,
      user_id: 0,
      icon: null,
      iconId: null,
      icon_id: null,
      isFolder: true,
      color: null,
      encrypt_version: null,
      plain_name: 'Folder2',
      deleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const createFolderSpy = (createFolder as Mock)
      .mockResolvedValueOnce(mockParentFolder)
      .mockResolvedValueOnce(mockChildFolder);

    vi.spyOn(tasksService, 'create').mockReturnValue('task-id');
    vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(errorService, 'castError').mockResolvedValue(new AppError('error'));

    await uploadMultipleFolder(
      [
        {
          currentFolderId: 'currentFolderId',
          root: {
            folderId: mockParentFolder.parentUuid,
            childrenFiles: [],
            childrenFolders: [
              {
                folderId: mockParentFolder.uuid,
                childrenFiles: [],
                childrenFolders: [],
                name: mockChildFolder.name,
                fullPathEdited: 'path2',
              },
            ],
            name: mockParentFolder.name,
            fullPathEdited: 'path1',
          },
          options: {
            taskId: 'task-id',
          },
        },
      ],
      null,
      { dispatch: mockDispatch },
    );

    expect(createFolderSpy).toHaveBeenCalledTimes(2);
  });
});
