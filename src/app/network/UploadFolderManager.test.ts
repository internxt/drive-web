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
import { deleteItemsThunk } from '../store/slices/storage/storage.thunks/deleteItemsThunk';
import { TaskStatus } from 'app/tasks/types';
import newStorageService from 'app/drive/services/new-storage.service';

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

  it('should mark the task as Error but keep the already-uploaded content when a child file upload fails', async () => {
    const mockFolder: DriveFolderData = {
      id: 0,
      uuid: 'uuid',
      name: 'FolderWithFailingFile',
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
      plain_name: 'FolderWithFailingFile',
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

    // The file upload thunk rejects (e.g. a 402 Payment Required response)
    const dispatch = vi.fn().mockReturnValue({ unwrap: () => Promise.reject(new AppError('Payment Required')) });

    vi.spyOn(tasksService, 'create').mockReturnValue(taskId);
    const updateTaskSpy = vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(tasksService, 'getTasks').mockReturnValue([]);
    // A file failure no longer marks the task as Error mid-flight; it stays in process until the
    // whole folder finishes, at which point it is marked as Error (partial upload) by the manager
    vi.spyOn(tasksService, 'findTask').mockReturnValue({ id: taskId, status: TaskStatus.InProcess } as never);
    vi.spyOn(tasksService, 'addListener').mockReturnValue();
    vi.spyOn(tasksService, 'removeListener').mockReturnValue();
    vi.spyOn(errorService, 'castError').mockImplementation((e) => e as never);

    await uploadFoldersWithManager({
      payload: [
        {
          currentFolderId: 'currentFolderId',
          root: {
            folderId: mockFolder.uuid,
            childrenFiles: [new File([new ArrayBuffer(10)], 'failing.txt')],
            childrenFolders: [],
            name: mockFolder.name,
            fullPathEdited: 'path1',
          },
          options: { taskId },
        },
      ],
      selectedWorkspace: null,
      dispatch,
      maxUploadFileSize: 100,
    });

    // The task must never be marked as Success
    expect(updateTaskSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ merge: expect.objectContaining({ status: TaskStatus.Success }) }),
    );
    // The task must be marked as Error (the subtitle key is resolved by i18n in the real app)
    expect(updateTaskSpy).toHaveBeenCalledWith(
      expect.objectContaining({ merge: expect.objectContaining({ status: TaskStatus.Error }) }),
    );
    // The already-uploaded content must be preserved: the root folder must NOT be deleted
    expect(deleteItemsThunk).not.toHaveBeenCalled();
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

  it('should keep uploading the rest of the tree and not delete the root folder when a file fails', async () => {
    const mockRootFolder: DriveFolderData = {
      id: 1,
      uuid: 'root-uuid',
      name: 'Root',
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
      plain_name: 'Root',
      deleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const mockChildFolder: DriveFolderData = { ...mockRootFolder, id: 2, uuid: 'child-uuid', name: 'Child' };
    const taskId = 'task-id';
    const failingFile = new File([new ArrayBuffer(0)], 'empty.txt');

    const createFolderSpy = (createFolder as Mock)
      .mockResolvedValueOnce(mockRootFolder)
      .mockResolvedValueOnce(mockChildFolder);
    (checkFolderDuplicated as Mock).mockResolvedValueOnce({
      duplicatedFoldersResponse: [] as DriveFolderData[],
      foldersWithDuplicates: [] as DriveFolderData[],
      foldersWithoutDuplicates: [mockRootFolder],
    });

    const failingDispatch = vi
      .fn()
      .mockReturnValue({ unwrap: () => Promise.reject(new AppError('Payment required', 402)) });

    const updateTaskSpy = vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(tasksService, 'create').mockReturnValue(taskId);
    vi.spyOn(tasksService, 'getTasks').mockReturnValue([]);
    vi.spyOn(tasksService, 'addListener').mockReturnValue();
    vi.spyOn(tasksService, 'removeListener').mockReturnValue();

    await uploadFoldersWithManager({
      payload: [
        {
          currentFolderId: 'currentFolderId',
          root: {
            folderId: mockRootFolder.uuid,
            childrenFiles: [failingFile],
            childrenFolders: [
              {
                folderId: mockChildFolder.uuid,
                childrenFiles: [],
                childrenFolders: [],
                name: mockChildFolder.name,
                fullPathEdited: 'path/child',
              },
            ],
            name: mockRootFolder.name,
            fullPathEdited: 'path',
          },
          options: { taskId },
        },
      ],
      selectedWorkspace: null,
      dispatch: failingDispatch,
      maxUploadFileSize: 100,
    });

    // The subfolder was still created -> the queue kept processing after the file failure
    expect(createFolderSpy).toHaveBeenCalledTimes(2);
    // The already-uploaded content was preserved: the root folder was NOT deleted
    expect(newStorageService.deleteFolderByUuid as Mock).not.toHaveBeenCalled();
    // The folder task ends as Error (partial upload), never as Success
    const mergedStatuses = updateTaskSpy.mock.calls.map((call) => call[0]?.merge?.status);
    expect(mergedStatuses).toContain(TaskStatus.Error);
    expect(mergedStatuses).not.toContain(TaskStatus.Success);
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
