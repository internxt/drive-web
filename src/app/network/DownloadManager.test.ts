import {
  DownloadItem,
  DownloadItemType,
  DownloadManagerService,
  DownloadTask,
  ErrorMessages,
} from 'app/drive/services/downloadManager.service';
import { createFilesIterator, createFoldersIterator } from 'app/drive/services/folder.service';
import { DriveFileData, DriveFolderData, DriveItemData } from 'app/drive/types';
import tasksService from 'app/tasks/services/tasks.service';
import { QueueUtilsService } from 'app/utils/queueUtils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DownloadManager } from './DownloadManager';
import { EncryptionVersion, FileStatus } from '@internxt/sdk/dist/drive/storage/types';
import { ConnectionLostError } from './requests';
import errorService from 'app/core/services/error.service';
import { TaskData, TaskStatus } from 'app/tasks/types';
import localStorageService from 'app/core/services/local-storage.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

vi.mock('i18next', () => ({ t: (_) => 'Test translation message' }));

describe('downloadManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(localStorageService, 'getUser').mockReturnValue({
      userId: 'user-id',
      bridgeUser: 'user-bridge',
      mnemonic: 'mnemonic',
    } as UserSettings);
  });

  it('should generate task for a folder and download it using the queue', async () => {
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
    const downloadItem: DownloadItem = {
      payload: [mockFolder as DriveItemData],
      selectedWorkspace: null,
      workspaceCredentials: null,
    };
    const mockTask: DownloadTask = {
      items: downloadItem.payload,
      credentials: {
        credentials: {
          user: 'any-user',
          pass: 'any-pass',
        },
        mnemonic: 'any-mnemonic',
      },
      taskId: 'any-taskId',
      createFilesIterator: createFilesIterator,
      createFoldersIterator: createFoldersIterator,
      options: {
        areSharedItems: false,
        downloadName: mockFolder.name,
        showErrors: true,
      },
      failedItems: [],
    };

    vi.spyOn(DownloadManagerService.instance, 'generateTasksForItem').mockResolvedValue(mockTask);
    vi.spyOn(QueueUtilsService.instance, 'getConcurrencyUsingPerfomance').mockReturnValue(6);
    vi.spyOn(tasksService, 'addListener').mockReturnValue();
    vi.spyOn(tasksService, 'removeListener').mockReturnValue();
    vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(tasksService, 'findTask').mockReturnValue(undefined);

    const downloadFolderSpy = vi.spyOn(DownloadManagerService.instance, 'downloadFolder').mockResolvedValue();
    const downloadFileSpy = vi
      .spyOn(DownloadManagerService.instance, 'downloadFile')
      .mockRejectedValue(new Error('It should download folder'));
    const downloadItemsSpy = vi
      .spyOn(DownloadManagerService.instance, 'downloadItems')
      .mockRejectedValue(new Error('It should download folder'));

    await DownloadManager.downloadItem(downloadItem);

    expect(downloadFolderSpy).toHaveBeenCalledOnce();
    expect(downloadFolderSpy).toHaveBeenCalledWith(mockTask, expect.anything(), expect.anything());
    expect(downloadFileSpy).not.toHaveBeenCalled();
    expect(downloadItemsSpy).not.toHaveBeenCalled();
  });

  it('should generate task for a file and download it using the queue', async () => {
    const mockFile: DriveFileData = {
      id: 0,
      uuid: 'uuid',
      bucket: 'bucket',
      name: 'File1',
      plainName: 'File1',
      plain_name: 'File1',
      type: 'jpg',
      size: 100,
      fileId: 'fileId1',
      folder_id: 1,
      folderId: 1,
      folderUuid: 'uuid1',
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deleted: false,
      deletedAt: null,
      currentThumbnail: null,
      encrypt_version: EncryptionVersion.Aes03,
      status: FileStatus.EXISTS,
      thumbnails: [],
    };
    const downloadItem: DownloadItem = {
      payload: [mockFile as DriveItemData],
      selectedWorkspace: null,
      workspaceCredentials: null,
    };
    const mockTask: DownloadTask = {
      items: downloadItem.payload,
      credentials: {
        credentials: {
          user: 'any-user',
          pass: 'any-pass',
        },
        mnemonic: 'any-mnemonic',
      },
      taskId: 'any-taskId',
      createFilesIterator: createFilesIterator,
      createFoldersIterator: createFoldersIterator,
      options: {
        areSharedItems: false,
        downloadName: mockFile.name,
        showErrors: true,
      },
      failedItems: [],
    };

    vi.spyOn(DownloadManagerService.instance, 'generateTasksForItem').mockResolvedValue(mockTask);
    vi.spyOn(QueueUtilsService.instance, 'getConcurrencyUsingPerfomance').mockReturnValue(6);
    vi.spyOn(tasksService, 'addListener').mockReturnValue();
    vi.spyOn(tasksService, 'removeListener').mockReturnValue();
    vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(tasksService, 'findTask').mockReturnValue(undefined);

    const downloadFolderSpy = vi
      .spyOn(DownloadManagerService.instance, 'downloadFolder')
      .mockRejectedValue(new Error('It should download file'));
    const downloadFileSpy = vi.spyOn(DownloadManagerService.instance, 'downloadFile').mockResolvedValue();
    const downloadItemsSpy = vi
      .spyOn(DownloadManagerService.instance, 'downloadItems')
      .mockRejectedValue(new Error('It should download file'));

    await DownloadManager.downloadItem(downloadItem);

    expect(downloadFileSpy).toHaveBeenCalledOnce();
    expect(downloadFileSpy).toHaveBeenCalledWith(mockTask, expect.anything());
    expect(downloadFolderSpy).not.toHaveBeenCalled();
    expect(downloadItemsSpy).not.toHaveBeenCalled();
  });

  it('should generate task for items and download them together using the queue', async () => {
    const mockFile: DriveFileData = {
      id: 0,
      uuid: 'uuid',
      bucket: 'bucket',
      name: 'File1',
      plainName: 'File1',
      plain_name: 'File1',
      type: 'jpg',
      size: 100,
      fileId: 'fileId1',
      folder_id: 1,
      folderId: 1,
      folderUuid: 'uuid1',
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deleted: false,
      deletedAt: null,
      currentThumbnail: null,
      encrypt_version: EncryptionVersion.Aes03,
      status: FileStatus.EXISTS,
      thumbnails: [],
    };
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
    const downloadItem: DownloadItem = {
      payload: [mockFile as DriveItemData, mockFolder as DriveItemData],
      selectedWorkspace: null,
      workspaceCredentials: null,
    };
    const mockTask: DownloadTask = {
      items: downloadItem.payload,
      credentials: {
        credentials: {
          user: 'any-user',
          pass: 'any-pass',
        },
        mnemonic: 'any-mnemonic',
      },
      taskId: 'any-taskId',
      createFilesIterator: createFilesIterator,
      createFoldersIterator: createFoldersIterator,
      options: {
        areSharedItems: false,
        downloadName: mockFile.name,
        showErrors: true,
      },
      failedItems: [],
    };

    vi.spyOn(DownloadManagerService.instance, 'generateTasksForItem').mockResolvedValue(mockTask);
    vi.spyOn(QueueUtilsService.instance, 'getConcurrencyUsingPerfomance').mockReturnValue(6);
    vi.spyOn(tasksService, 'addListener').mockReturnValue();
    vi.spyOn(tasksService, 'removeListener').mockReturnValue();
    vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(tasksService, 'findTask').mockReturnValue(undefined);

    const downloadFolderSpy = vi
      .spyOn(DownloadManagerService.instance, 'downloadFolder')
      .mockRejectedValue(new Error('It should download items'));
    const downloadFileSpy = vi
      .spyOn(DownloadManagerService.instance, 'downloadFile')
      .mockRejectedValue(new Error('It should download items'));
    const downloadItemsSpy = vi.spyOn(DownloadManagerService.instance, 'downloadItems').mockResolvedValue();

    await DownloadManager.downloadItem(downloadItem);

    expect(downloadItemsSpy).toHaveBeenCalledOnce();
    expect(downloadItemsSpy).toHaveBeenCalledWith(mockTask, expect.anything(), expect.anything());
    expect(downloadFolderSpy).not.toHaveBeenCalled();
    expect(downloadFileSpy).not.toHaveBeenCalled();
  });

  it('should modify queue concurrency if its needed', async () => {
    const mockFile: DriveFileData = {
      id: 0,
      uuid: 'uuid',
      bucket: 'bucket',
      name: 'File1',
      plainName: 'File1',
      plain_name: 'File1',
      type: 'jpg',
      size: 100,
      fileId: 'fileId1',
      folder_id: 1,
      folderId: 1,
      folderUuid: 'uuid1',
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deleted: false,
      deletedAt: null,
      currentThumbnail: null,
      encrypt_version: EncryptionVersion.Aes03,
      status: FileStatus.EXISTS,
      thumbnails: [],
    };
    const downloadItem: DownloadItem = {
      payload: [mockFile as DriveItemData],
      selectedWorkspace: null,
      workspaceCredentials: null,
    };
    const mockTask: DownloadTask = {
      items: downloadItem.payload,
      credentials: {
        credentials: {
          user: 'any-user',
          pass: 'any-pass',
        },
        mnemonic: 'any-mnemonic',
      },
      taskId: 'any-taskId',
      createFilesIterator: createFilesIterator,
      createFoldersIterator: createFoldersIterator,
      options: {
        areSharedItems: false,
        downloadName: mockFile.name,
        showErrors: true,
      },
      failedItems: [],
    };
    const newConcurrency = DownloadManager.downloadQueue.concurrency + 1;

    vi.spyOn(QueueUtilsService.instance, 'getConcurrencyUsingPerfomance').mockReturnValue(newConcurrency);

    vi.spyOn(DownloadManagerService.instance, 'generateTasksForItem').mockResolvedValue(mockTask);
    vi.spyOn(tasksService, 'addListener').mockReturnValue();
    vi.spyOn(tasksService, 'removeListener').mockReturnValue();
    vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(tasksService, 'findTask').mockReturnValue(undefined);

    vi.spyOn(DownloadManagerService.instance, 'downloadFolder').mockResolvedValue();
    vi.spyOn(DownloadManagerService.instance, 'downloadFile').mockResolvedValue();
    vi.spyOn(DownloadManagerService.instance, 'downloadItems').mockResolvedValue();

    await DownloadManager.downloadItem(downloadItem);
    const currentConcurrency = DownloadManager.downloadQueue.concurrency;

    expect(currentConcurrency).toEqual(newConcurrency);
  });

  it('should abort download task when abortcontroller abort is called', async () => {
    const abortController = new AbortController();
    const mockFile: DriveFileData = {
      id: 0,
      uuid: 'uuid',
      bucket: 'bucket',
      name: 'File1',
      plainName: 'File1',
      plain_name: 'File1',
      type: 'jpg',
      size: 100,
      fileId: 'fileId1',
      folder_id: 1,
      folderId: 1,
      folderUuid: 'uuid1',
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deleted: false,
      deletedAt: null,
      currentThumbnail: null,
      encrypt_version: EncryptionVersion.Aes03,
      status: FileStatus.EXISTS,
      thumbnails: [],
    };
    const downloadItem: DownloadItem = {
      payload: [mockFile as DriveItemData],
      selectedWorkspace: null,
      workspaceCredentials: null,
    };
    const mockTask: DownloadTask = {
      items: downloadItem.payload,
      credentials: {
        credentials: {
          user: 'any-user',
          pass: 'any-pass',
        },
        mnemonic: 'any-mnemonic',
      },
      taskId: 'any-taskId',
      createFilesIterator: createFilesIterator,
      createFoldersIterator: createFoldersIterator,
      options: {
        areSharedItems: false,
        downloadName: mockFile.name,
        showErrors: true,
      },
      abortController,
      failedItems: [],
    };
    const newConcurrency = DownloadManager.downloadQueue.concurrency + 1;

    vi.spyOn(QueueUtilsService.instance, 'getConcurrencyUsingPerfomance').mockReturnValue(newConcurrency);

    vi.spyOn(DownloadManagerService.instance, 'generateTasksForItem').mockResolvedValue(mockTask);
    vi.spyOn(tasksService, 'addListener').mockReturnValue();
    vi.spyOn(tasksService, 'removeListener').mockReturnValue();
    vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(tasksService, 'findTask').mockReturnValue(undefined);

    const downloadFolderSpy = vi.spyOn(DownloadManagerService.instance, 'downloadFolder').mockResolvedValue();
    const downloadFileSpy = vi.spyOn(DownloadManagerService.instance, 'downloadFile').mockResolvedValue();
    const downloadItemsSpy = vi.spyOn(DownloadManagerService.instance, 'downloadItems').mockResolvedValue();

    const downloadPromise = DownloadManager.downloadItem(downloadItem);
    abortController.abort();

    await expect(downloadPromise).rejects.toThrow(new Error('Download aborted'));
    expect(abortController.signal.aborted).toBe(true);
    expect(downloadFolderSpy).not.toHaveBeenCalled();
    expect(downloadFileSpy).not.toHaveBeenCalled();
    expect(downloadItemsSpy).not.toHaveBeenCalled();
  });

  it('should handle connection lost error during download', async () => {
    const mockFile: DriveFileData = {
      id: 0,
      uuid: 'uuid',
      bucket: 'bucket',
      name: 'File1',
      plainName: 'File1',
      plain_name: 'File1',
      type: 'jpg',
      size: 100,
      fileId: 'fileId1',
      folder_id: 1,
      folderId: 1,
      folderUuid: 'uuid1',
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deleted: false,
      deletedAt: null,
      currentThumbnail: null,
      encrypt_version: EncryptionVersion.Aes03,
      status: FileStatus.EXISTS,
      thumbnails: [],
    };

    const downloadItem: DownloadItem = {
      payload: [mockFile as DriveItemData],
      selectedWorkspace: null,
      workspaceCredentials: null,
    };

    const mockTask: DownloadTask = {
      items: downloadItem.payload,
      credentials: {
        credentials: {
          user: 'any-user',
          pass: 'any-pass',
        },
        mnemonic: 'any-mnemonic',
      },
      taskId: 'any-taskId',
      createFilesIterator: createFilesIterator,
      createFoldersIterator: createFoldersIterator,
      options: {
        areSharedItems: false,
        downloadName: mockFile.name,
        showErrors: true,
      },
      failedItems: [],
    };

    vi.spyOn(DownloadManagerService.instance, 'generateTasksForItem').mockResolvedValue(mockTask);
    vi.spyOn(QueueUtilsService.instance, 'getConcurrencyUsingPerfomance').mockReturnValue(6);
    vi.spyOn(tasksService, 'addListener').mockReturnValue();
    vi.spyOn(tasksService, 'removeListener').mockReturnValue();
    vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(tasksService, 'findTask').mockReturnValue(undefined);

    const connectionLostError = new ConnectionLostError();

    const downloadFolderSpy = vi
      .spyOn(DownloadManagerService.instance, 'downloadFolder')
      .mockRejectedValue(new Error('It should download file'));
    const downloadFileSpy = vi
      .spyOn(DownloadManagerService.instance, 'downloadFile')
      .mockRejectedValue(connectionLostError);
    const downloadItemsSpy = vi
      .spyOn(DownloadManagerService.instance, 'downloadItems')
      .mockRejectedValue(new Error('It should download file'));

    const downloadPromise = DownloadManager.downloadItem(downloadItem);

    await expect(downloadPromise).rejects.toThrow(connectionLostError);

    expect(downloadFileSpy).toHaveBeenCalledWith(mockTask, expect.anything());
    expect(downloadFolderSpy).not.toHaveBeenCalled();
    expect(downloadItemsSpy).not.toHaveBeenCalled();
  });

  it('should handle file error during download', async () => {
    const mockFile: DriveFileData = {
      id: 0,
      uuid: 'uuid',
      bucket: 'bucket',
      name: 'File1',
      plainName: 'File1',
      plain_name: 'File1',
      type: 'jpg',
      size: 100,
      fileId: 'fileId1',
      folder_id: 1,
      folderId: 1,
      folderUuid: 'uuid1',
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deleted: false,
      deletedAt: null,
      currentThumbnail: null,
      encrypt_version: EncryptionVersion.Aes03,
      status: FileStatus.EXISTS,
      thumbnails: [],
    };

    const downloadItem: DownloadItem = {
      payload: [mockFile as DriveItemData],
      selectedWorkspace: null,
      workspaceCredentials: null,
    };

    const mockTask: DownloadTask = {
      items: downloadItem.payload,
      credentials: {
        credentials: {
          user: 'any-user',
          pass: 'any-pass',
        },
        mnemonic: 'any-mnemonic',
      },
      taskId: 'any-taskId',
      createFilesIterator: createFilesIterator,
      createFoldersIterator: createFoldersIterator,
      options: {
        areSharedItems: false,
        downloadName: mockFile.name,
        showErrors: true,
      },
      failedItems: [],
    };

    vi.spyOn(DownloadManagerService.instance, 'generateTasksForItem').mockResolvedValue(mockTask);
    vi.spyOn(QueueUtilsService.instance, 'getConcurrencyUsingPerfomance').mockReturnValue(6);
    vi.spyOn(tasksService, 'addListener').mockReturnValue();
    vi.spyOn(tasksService, 'removeListener').mockReturnValue();
    vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(tasksService, 'findTask').mockReturnValue({
      id: 'any-taskId',
      status: TaskStatus.Error,
    } as TaskData);

    const testError = new Error(ErrorMessages.ServerUnavailable);

    const downloadFolderSpy = vi
      .spyOn(DownloadManagerService.instance, 'downloadFolder')
      .mockRejectedValue(new Error('It should download file'));
    const downloadFileSpy = vi.spyOn(DownloadManagerService.instance, 'downloadFile').mockRejectedValue(testError);
    const downloadItemsSpy = vi
      .spyOn(DownloadManagerService.instance, 'downloadItems')
      .mockRejectedValue(new Error('It should download file'));

    const errorServiceSpy = vi.spyOn(errorService, 'reportError');

    const downloadPromise = DownloadManager.downloadItem(downloadItem);
    await expect(downloadPromise).rejects.toThrow(testError);

    expect(errorServiceSpy).toHaveBeenCalledWith(testError, {
      extra: { fileName: mockFile.name, bucket: mockFile.bucket, fileSize: mockFile.size, fileType: mockFile.type },
    });
    expect(downloadFileSpy).toHaveBeenCalledWith(mockTask, expect.anything());
    expect(downloadFolderSpy).not.toHaveBeenCalled();
    expect(downloadItemsSpy).not.toHaveBeenCalled();
  });

  it('should handle folder error during download', async () => {
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
    const downloadItem: DownloadItem = {
      payload: [mockFolder as DriveItemData],
      selectedWorkspace: null,
      workspaceCredentials: null,
    };
    const mockTask: DownloadTask = {
      items: downloadItem.payload,
      credentials: {
        credentials: {
          user: 'any-user',
          pass: 'any-pass',
        },
        mnemonic: 'any-mnemonic',
      },
      taskId: 'any-taskId',
      createFilesIterator: createFilesIterator,
      createFoldersIterator: createFoldersIterator,
      options: {
        areSharedItems: false,
        downloadName: mockFolder.name,
        showErrors: true,
      },
      failedItems: [],
    };

    vi.spyOn(DownloadManagerService.instance, 'generateTasksForItem').mockResolvedValue(mockTask);
    vi.spyOn(QueueUtilsService.instance, 'getConcurrencyUsingPerfomance').mockReturnValue(6);
    vi.spyOn(tasksService, 'addListener').mockReturnValue();
    vi.spyOn(tasksService, 'removeListener').mockReturnValue();
    vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(tasksService, 'findTask').mockReturnValue({
      id: 'any-taskId',
      status: TaskStatus.Error,
    } as TaskData);

    const testError = new Error(ErrorMessages.ServerUnavailable);

    const downloadFolderSpy = vi.spyOn(DownloadManagerService.instance, 'downloadFolder').mockRejectedValue(testError);
    const downloadFileSpy = vi
      .spyOn(DownloadManagerService.instance, 'downloadFile')
      .mockRejectedValue(new Error('It should download folder'));
    const downloadItemsSpy = vi
      .spyOn(DownloadManagerService.instance, 'downloadItems')
      .mockRejectedValue(new Error('It should download folder'));

    const errorServiceSpy = vi.spyOn(errorService, 'reportError');

    const downloadPromise = DownloadManager.downloadItem(downloadItem);
    await expect(downloadPromise).rejects.toThrow(testError);

    expect(errorServiceSpy).toHaveBeenCalledWith(testError, {
      extra: { folder: mockFolder.name, bucket: mockFolder.bucket, folderParentId: mockFolder.parentId },
    });
    expect(downloadFileSpy).not.toHaveBeenCalled();
    expect(downloadFolderSpy).toHaveBeenCalledWith(mockTask, expect.anything(), expect.anything());
    expect(downloadItemsSpy).not.toHaveBeenCalled();
  });

  it('should handle task cancellation during download', async () => {
    const mockFile: DriveFileData = {
      id: 0,
      uuid: 'uuid',
      bucket: 'bucket',
      name: 'File1',
      plainName: 'File1',
      plain_name: 'File1',
      type: 'jpg',
      size: 100,
      fileId: 'fileId1',
      folder_id: 1,
      folderId: 1,
      folderUuid: 'uuid1',
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deleted: false,
      deletedAt: null,
      currentThumbnail: null,
      encrypt_version: EncryptionVersion.Aes03,
      status: FileStatus.EXISTS,
      thumbnails: [],
    };

    const downloadItem: DownloadItem = {
      payload: [mockFile as DriveItemData],
      selectedWorkspace: null,
      workspaceCredentials: null,
    };

    const mockTask: DownloadTask = {
      items: downloadItem.payload,
      credentials: {
        credentials: {
          user: 'any-user',
          pass: 'any-pass',
        },
        mnemonic: 'any-mnemonic',
      },
      taskId: 'any-taskId',
      createFilesIterator: createFilesIterator,
      createFoldersIterator: createFoldersIterator,
      options: {
        areSharedItems: false,
        downloadName: mockFile.name,
        showErrors: true,
      },
      failedItems: [],
    };

    vi.spyOn(DownloadManagerService.instance, 'generateTasksForItem').mockResolvedValue(mockTask);
    vi.spyOn(DownloadManagerService.instance, 'downloadFile').mockResolvedValue();
    vi.spyOn(tasksService, 'findTask').mockReturnValue({
      id: 'any-taskId',
      status: TaskStatus.Cancelled,
    } as TaskData);

    await expect(DownloadManager.downloadItem(downloadItem)).resolves.not.toThrow();
  });

  describe('compareArraysByIdAndFolder', () => {
    it('should return true for arrays with identical id and isFolder properties', () => {
      const arr1 = [
        { id: 1, isFolder: true },
        { id: 2, isFolder: false },
      ] as DownloadItemType[];
      const arr2 = [
        { id: 1, isFolder: true },
        { id: 2, isFolder: false },
      ] as DownloadItemType[];

      const result = DownloadManager['compareArraysByIdAndFolder'](arr1, arr2);
      expect(result).toBe(true);
    });

    it('should return false for arrays with different lengths', () => {
      const arr1 = [{ id: 1, isFolder: true }] as DownloadItemType[];
      const arr2 = [
        { id: 1, isFolder: true },
        { id: 2, isFolder: false },
      ] as DownloadItemType[];

      const result = DownloadManager['compareArraysByIdAndFolder'](arr1, arr2);
      expect(result).toBe(false);
    });

    it('should return false for arrays with different id properties', () => {
      const arr1 = [{ id: 1, isFolder: true }] as DownloadItemType[];
      const arr2 = [{ id: 2, isFolder: true }] as DownloadItemType[];

      const result = DownloadManager['compareArraysByIdAndFolder'](arr1, arr2);
      expect(result).toBe(false);
    });

    it('should return false for arrays with different isFolder properties', () => {
      const arr1: DownloadItemType[] = [{ id: 1, isFolder: true }] as DownloadItemType[];
      const arr2: DownloadItemType[] = [{ id: 1, isFolder: false }] as DownloadItemType[];

      const result = DownloadManager['compareArraysByIdAndFolder'](arr1, arr2);
      expect(result).toBe(false);
    });
  });
});
