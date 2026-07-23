import { DriveFolderData } from 'app/drive/types';
import { createFolder } from 'app/store/slices/storage/folderUtils/createFolder';
import { checkFolderDuplicated } from 'app/store/slices/storage/folderUtils/checkFolderDuplicated';
import { getUniqueFolderName } from 'app/store/slices/storage/folderUtils/getUniqueFolderName';
import { beforeEach, describe, expect, it, Mock, test, vi } from 'vitest';
import {
  TaskFolder,
  UploadFolderManagerEvents,
  UploadFoldersManager,
  uploadFoldersWithManager,
} from './UploadFolderManager';
import { FilesExceedsSizeLimitError } from 'app/drive/services/file.service/upload.errors';
import { uploadItemsParallelThunk } from 'app/store/slices/storage/storage.thunks/uploadItemsThunk';

vi.mock('app/drive/services/new-storage.service', () => ({
  default: {
    deleteFolderByUuid: vi.fn(),
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

vi.mock('services/error.service', () => ({
  default: {
    castError: vi.fn().mockImplementation((e) => e),
    reportError: vi.fn(),
  },
}));

describe('uploadFoldersWithManager', () => {
  const mockDispatch = vi.fn();

  const buildFolderData = (overrides: Partial<DriveFolderData> = {}): DriveFolderData =>
    ({
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
      ...overrides,
    }) as DriveFolderData;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('When a folder upload completes, then the folder is created and the upload is notified from start to success', async () => {
    const mockFolder = buildFolderData({ name: 'MyFolder', plain_name: 'MyFolder' });
    const taskId = 'task-id';

    const createFolderSpy = (createFolder as Mock).mockResolvedValueOnce(mockFolder);
    (checkFolderDuplicated as Mock).mockResolvedValueOnce({
      duplicatedFoldersResponse: [],
      foldersWithDuplicates: [],
      foldersWithoutDuplicates: [mockFolder],
    });

    const events: UploadFolderManagerEvents = {
      onFolderUploadStarted: vi.fn(),
      onFolderUploadSuccess: vi.fn(),
      onFolderUploadError: vi.fn(),
    };

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
      events,
    });

    expect(createFolderSpy).toHaveBeenCalledOnce();
    expect(events.onFolderUploadStarted).toHaveBeenCalledWith(
      taskId,
      expect.objectContaining({ name: 'MyFolder' }),
      expect.objectContaining({
        cancelUpload: expect.any(Function),
        pauseUpload: expect.any(Function),
        resumeUpload: expect.any(Function),
      }),
    );
    expect(events.onFolderUploadSuccess).toHaveBeenCalledOnce();
    expect(events.onFolderUploadSuccess).toHaveBeenCalledWith(taskId, {
      folderName: 'MyFolder',
      rootFolderUUID: mockFolder.uuid,
    });
    expect(events.onFolderUploadError).not.toHaveBeenCalled();
  });

  it('When a folder name already exists, then the folder is uploaded and announced with a new unique name', async () => {
    const mockFolder = buildFolderData();
    const taskId = 'task-id';

    (createFolder as Mock).mockResolvedValueOnce(mockFolder);
    (checkFolderDuplicated as Mock).mockResolvedValueOnce({
      duplicatedFoldersResponse: [mockFolder] as DriveFolderData[],
      foldersWithDuplicates: [mockFolder] as DriveFolderData[],
      foldersWithoutDuplicates: [],
    });
    const renameFolderSpy = (getUniqueFolderName as Mock).mockResolvedValueOnce('renamed-folder1');

    const events: UploadFolderManagerEvents = { onFolderUploadStarted: vi.fn() };

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
      events,
    });

    expect(renameFolderSpy).toHaveBeenCalledOnce();
    expect(events.onFolderUploadStarted).toHaveBeenCalledWith(
      taskId,
      expect.objectContaining({ name: 'renamed-folder1' }),
      expect.any(Object),
    );
  });

  it('When a folder has subfolders, then every level is uploaded', async () => {
    const mockParentFolder = buildFolderData({ id: 1, uuid: 'uuid1' });
    const mockChildFolder = buildFolderData({
      id: 2,
      uuid: 'uuid2',
      name: 'Folder2',
      parentId: 1,
      parent_id: 1,
      parentUuid: 'uuid1',
      plain_name: 'Folder2',
    });
    const taskId = 'task-id';

    const createFolderSpy = (createFolder as Mock)
      .mockResolvedValueOnce(mockParentFolder)
      .mockResolvedValueOnce(mockChildFolder);

    (checkFolderDuplicated as Mock).mockResolvedValueOnce({
      duplicatedFoldersResponse: [] as DriveFolderData[],
      foldersWithDuplicates: [] as DriveFolderData[],
      foldersWithoutDuplicates: [mockParentFolder],
    });

    (getUniqueFolderName as Mock).mockResolvedValueOnce('');

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
  });

  describe('Handle File Uploads', () => {
    const taskId = 'task-id';
    const mockCreatedFolder = buildFolderData({ uuid: 'folder-uuid' });

    const buildManager = (dispatch = mockDispatch, maxUploadFileSize = 100, events?: UploadFolderManagerEvents) => {
      const manager = new UploadFoldersManager({
        payload: [],
        selectedWorkspace: null,
        dispatch,
        maxUploadFileSize,
        events,
      });
      manager['tasksInfo'][taskId] = { cancelled: false, progress: { itemsUploaded: 0, totalItems: 1 } };
      return manager;
    };

    test('When all files exceed the size limit and there are no subfolders, then an error indicating so is thrown', async () => {
      const bigFile = new File([new ArrayBuffer(200)], 'big.mp4');
      const manager = buildManager();
      const level = { childrenFiles: [bigFile], childrenFolders: [], folderId: 'f', name: 'F', fullPathEdited: '' };

      await expect(
        manager['handleFileUploads'](level, mockCreatedFolder, taskId, new AbortController()),
      ).rejects.toThrow(FilesExceedsSizeLimitError);
    });

    test('When a folder has files exceeding the size limit but also has subfolders, then the upload continues', async () => {
      const bigFile = new File([new ArrayBuffer(200)], 'big.mp4');
      const dispatchWithUnwrap = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() });
      const manager = buildManager(dispatchWithUnwrap);
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

  it('When the upload was already cancelled, then the folder is not uploaded', async () => {
    const mockParentFolder = buildFolderData({ id: 1, uuid: 'uuid1' });
    const mockChildFolder = buildFolderData({
      id: 2,
      uuid: 'uuid2',
      name: 'Folder2',
      parentId: 1,
      parent_id: 1,
      parentUuid: 'uuid1',
      plain_name: 'Folder2',
    });
    const taskId = 'task-id';

    const manager = new UploadFoldersManager({
      payload: [],
      selectedWorkspace: null,
      dispatch: mockDispatch,
      maxUploadFileSize: 100,
    });
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
      cancelled: false,
      progress: {
        itemsUploaded: 0,
        totalItems: 2,
      },
      rootFolderItem: mockParentFolder,
    };

    abortController.abort();

    const uploadPromise = manager['uploadFolderAsync'](taskFolder);

    await expect(uploadPromise).resolves.toBeUndefined();
    expect(createFolderSpy).not.toHaveBeenCalled();
    expect(renameFolderSpy).not.toHaveBeenCalled();
  });
});
