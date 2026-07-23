import errorService from 'services/error.service';
import { AppError } from '@internxt/sdk';
import { DriveFolderData } from 'app/drive/types';
import { createFolder } from 'app/store/slices/storage/folderUtils/createFolder';
import { checkFolderDuplicated } from 'app/store/slices/storage/folderUtils/checkFolderDuplicated';
import { getUniqueFolderName } from 'app/store/slices/storage/folderUtils/getUniqueFolderName';
import tasksService from 'app/tasks/services/tasks.service';
import { beforeEach, describe, expect, it, Mock, test, vi } from 'vitest';
import { TaskFolder, UploadFoldersManager, uploadFoldersWithManager } from './UploadFolderManager';
import * as networkInformation from './networkInformation';
import { FilesExceedsSizeLimitError } from 'app/drive/services/file.service/upload.errors';
import { uploadItemsParallelThunk } from 'app/store/slices/storage/storage.thunks/uploadItemsThunk';

vi.mock('app/drive/services/new-storage.service', () => ({
  default: {
    deleteFolderByUuid: vi.fn(),
  },
}));

vi.mock('app/tasks/services/tasks.service', () => ({
  default: {
    create: vi.fn(),
    updateTask: vi.fn(),
    getTasks: vi.fn(),
    findTask: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
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

vi.mock('app/store/slices/storage/folderUtils/createFolder', () => ({
  createFolder: vi.fn(),
}));

vi.mock('app/store/slices/storage/folderUtils/checkFolderDuplicated', () => ({
  checkFolderDuplicated: vi.fn(),
}));

vi.mock('../store/slices/storage/storage.thunks/deleteItemsThunk', () => ({
  deleteItemsThunk: vi.fn(),
}));

vi.mock('../store/slices/storage/storage.thunks/uploadItemsThunk', () => ({
  uploadItemsParallelThunk: vi.fn(),
}));

vi.mock('app/store/slices/storage/folderUtils/getUniqueFolderName', () => ({
  getUniqueFolderName: vi.fn(),
}));

vi.mock('services/referral.service', () => ({
  default: {
    trackFolderUpload: vi.fn(),
  },
}));

vi.mock('./networkInformation', () => ({
  logNetworkInfoForUpload: vi.fn(),
}));

vi.mock('services/error.service', () => ({
  default: {
    castError: vi.fn().mockImplementation((e) => e),
    reportError: vi.fn(),
  },
}));

describe('checkUploadFolders', () => {
  const mockDispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
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
      maxUploadFileSize: 100,
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
      maxUploadFileSize: 100,
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
      maxUploadFileSize: 100,
    });

    expect(createFolderSpy).toHaveBeenCalledTimes(2);
    expect(renameFolderSpy).not.toHaveBeenCalled();
  });

  it('should log network information on successful folder upload', async () => {
    const logNetworkInfoMock = networkInformation.logNetworkInfoForUpload as Mock;
    const mockFolder: DriveFolderData = {
      id: 0,
      uuid: 'uuid',
      name: 'MyFolder',
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
      plain_name: 'MyFolder',
      deleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const taskId = 'task-id';

    (createFolder as Mock).mockResolvedValueOnce(mockFolder);
    (checkFolderDuplicated as Mock).mockResolvedValueOnce({
      duplicatedFoldersResponse: [],
      foldersWithDuplicates: [],
      foldersWithoutDuplicates: [mockFolder],
    });
    vi.spyOn(tasksService, 'create').mockReturnValue(taskId);
    vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(tasksService, 'addListener').mockReturnValue();
    vi.spyOn(tasksService, 'removeListener').mockReturnValue();

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
          options: { taskId },
        },
      ],
      selectedWorkspace: null,
      dispatch: mockDispatch,
      maxUploadFileSize: 100,
    });

    expect(logNetworkInfoMock).toHaveBeenCalledOnce();
    expect(logNetworkInfoMock).toHaveBeenCalledWith({ folderName: 'MyFolder' });
  });

  describe('Handle File Uploads', () => {
    const taskId = 'task-id';
    const mockCreatedFolder: DriveFolderData = {
      id: 0,
      uuid: 'folder-uuid',
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

    const buildManager = (maxUploadFileSize?: number) => {
      const manager = new UploadFoldersManager([], null, mockDispatch, maxUploadFileSize ?? 100);
      manager['tasksInfo'][taskId] = { progress: { itemsUploaded: 0, totalItems: 1 } };
      return manager;
    };

    test('When all files exceed the size limit and there are no subfolders, then an error indicating so is thrown', async () => {
      const bigFile = new File([new ArrayBuffer(200)], 'big.mp4');
      vi.spyOn(tasksService, 'updateTask').mockReturnValue();
      vi.spyOn(tasksService, 'getTasks').mockReturnValue([]);
      const manager = buildManager(100);
      const level = { childrenFiles: [bigFile], childrenFolders: [], folderId: 'f', name: 'F', fullPathEdited: '' };

      await expect(
        manager['handleFileUploads'](level, mockCreatedFolder, taskId, new AbortController()),
      ).rejects.toThrow(FilesExceedsSizeLimitError);
    });

    test('When a folder has files exceeding the size limit but also has subfolders, then it dispatches the upload', async () => {
      const bigFile = new File([new ArrayBuffer(200)], 'big.mp4');
      const dispatchWithUnwrap = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() });
      vi.spyOn(tasksService, 'updateTask').mockReturnValue();
      const manager = new UploadFoldersManager([], null, dispatchWithUnwrap, 100);
      manager['tasksInfo'][taskId] = { progress: { itemsUploaded: 0, totalItems: 1 } };
      const level = {
        childrenFiles: [bigFile],
        childrenFolders: [{ folderId: 'c', childrenFiles: [], childrenFolders: [], name: 'Child', fullPathEdited: '' }],
        folderId: 'f',
        name: 'F',
        fullPathEdited: '',
      };

      await manager['handleFileUploads'](level, mockCreatedFolder, taskId, new AbortController());

      expect(uploadItemsParallelThunk).toHaveBeenCalledWith(
        expect.objectContaining({ files: level.childrenFiles, parentFolderId: mockCreatedFolder.uuid }),
      );
    });
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

    const manager = new UploadFoldersManager(payload, selectedWorkspace, mockDispatch, 100);
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
