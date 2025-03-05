import errorService from 'app/core/services/error.service';
import AppError from 'app/core/types';
import { DriveFolderData } from 'app/drive/types';
import { createFolder } from 'app/store/slices/storage/folderUtils/createFolder';
import { checkFolderDuplicated } from 'app/store/slices/storage/folderUtils/checkFolderDuplicated';
import { getUniqueFolderName } from 'app/store/slices/storage/folderUtils/getUniqueFolderName';
import tasksService from 'app/tasks/services/tasks.service';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { TaskFolder, UploadFoldersManager, uploadFoldersWithManager } from './UploadFolderManager';

vi.mock('app/store/slices/storage/storage.thunks', () => ({
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

vi.mock('app/store/slices/plan', () => ({
  default: {
    initializeThunk: vi.fn(),
    fetchLimitThunk: vi.fn(),
    fetchUsageThunk: vi.fn(),
    fetchSubscriptionThunk: vi.fn(),
    fetchBusinessLimitUsageThunk: vi.fn(),
  },
  planThunks: {
    initializeThunk: vi.fn(),
    fetchLimitThunk: vi.fn(),
    fetchUsageThunk: vi.fn(),
    fetchSubscriptionThunk: vi.fn(),
    fetchBusinessLimitUsageThunk: vi.fn(),
  },
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

vi.mock('app/store/slices/storage/folderUtils/createFolder', () => ({
  createFolder: vi.fn(),
}));

vi.mock('app/store/slices/storage/folderUtils/checkFolderDuplicated', () => ({
  checkFolderDuplicated: vi.fn(),
}));

vi.mock('app/store/slices/storage/folderUtils/getUniqueFolderName', () => ({
  getUniqueFolderName: vi.fn(),
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
    const taskId = 'task-id';

    const createFolderSpy = (createFolder as Mock).mockResolvedValueOnce(mockFolder);

    (checkFolderDuplicated as Mock).mockResolvedValueOnce({
      duplicatedFoldersResponse: [] as DriveFolderData[],
      foldersWithDuplicates: [] as DriveFolderData[],
      foldersWithoutDuplicates: [mockFolder],
    });
    vi.spyOn(tasksService, 'create').mockReturnValue(taskId);
    vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(tasksService, 'addListener').mockReturnValue();
    vi.spyOn(tasksService, 'removeListener').mockReturnValue();
    vi.spyOn(errorService, 'castError').mockResolvedValue(new AppError('error'));

    await uploadFoldersWithManager({
      payload: [
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
            taskId,
          },
        },
      ],
      selectedWorkspace: null,
      dispatch: mockDispatch,
    });

    expect(createFolderSpy).toHaveBeenCalledOnce();
  });

  it('should rename folder before upload using an async queue', async () => {
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
    const taskId = 'task-id';

    const createFolderSpy = (createFolder as Mock).mockResolvedValueOnce(mockFolder);

    (checkFolderDuplicated as Mock).mockResolvedValueOnce({
      duplicatedFoldersResponse: [mockFolder] as DriveFolderData[],
      foldersWithDuplicates: [mockFolder] as DriveFolderData[],
      foldersWithoutDuplicates: [],
    });

    const renameFolderSpy = (getUniqueFolderName as Mock).mockResolvedValueOnce('renamed-folder1');

    vi.spyOn(tasksService, 'create').mockReturnValue(taskId);
    vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(tasksService, 'addListener').mockReturnValue();
    vi.spyOn(tasksService, 'removeListener').mockReturnValue();
    vi.spyOn(errorService, 'castError').mockResolvedValue(new AppError('error'));

    await uploadFoldersWithManager({
      payload: [
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
            taskId,
          },
        },
      ],
      selectedWorkspace: null,
      dispatch: mockDispatch,
    });

    expect(createFolderSpy).toHaveBeenCalledOnce();
    expect(renameFolderSpy).toHaveBeenCalledOnce();
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
    const taskId = 'task-id';

    const createFolderSpy = (createFolder as Mock)
      .mockResolvedValueOnce(mockParentFolder)
      .mockResolvedValueOnce(mockChildFolder);

    (checkFolderDuplicated as Mock).mockResolvedValueOnce({
      duplicatedFoldersResponse: [] as DriveFolderData[],
      foldersWithDuplicates: [] as DriveFolderData[],
      foldersWithoutDuplicates: [mockParentFolder],
    });

    const renameFolderSpy = (getUniqueFolderName as Mock).mockResolvedValueOnce('');

    vi.spyOn(tasksService, 'create').mockReturnValue(taskId);
    vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(errorService, 'castError').mockResolvedValue(new AppError('error'));

    await uploadFoldersWithManager({
      payload: [
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
            taskId,
          },
        },
      ],
      selectedWorkspace: null,
      dispatch: mockDispatch,
    });

    expect(createFolderSpy).toHaveBeenCalledTimes(2);
    expect(renameFolderSpy).not.toHaveBeenCalled();
  });

  it('should abort the upload if abortController is called', async () => {
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
    const payload = [];
    const selectedWorkspace = null;
    const taskId = 'task-id';

    const manager = new UploadFoldersManager(payload, selectedWorkspace, mockDispatch);
    const abortController = new AbortController();

    const taskFolder: TaskFolder = {
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
      taskId,
      abortController,
    };

    const createFolderSpy = (createFolder as Mock)
      .mockResolvedValueOnce(mockParentFolder)
      .mockResolvedValueOnce(mockChildFolder);

    (checkFolderDuplicated as Mock).mockResolvedValueOnce({
      duplicatedFoldersResponse: [] as DriveFolderData[],
      foldersWithDuplicates: [] as DriveFolderData[],
      foldersWithoutDuplicates: [mockParentFolder],
    });

    const renameFolderSpy = (getUniqueFolderName as Mock).mockResolvedValueOnce('');

    manager['tasksInfo'][taskId] = {
      progress: {
        itemsUploaded: 0,
        totalItems: 2,
      },
      rootFolderItem: mockParentFolder,
    };

    abortController.abort();

    const uploadPromise = manager['uploadFolderAsync'](taskFolder);

    await expect(uploadPromise).resolves.toBeUndefined();
    expect(abortController.signal.aborted).toBe(true);
    expect(createFolderSpy).not.toHaveBeenCalled();
    expect(renameFolderSpy).not.toHaveBeenCalled();
  });
});
