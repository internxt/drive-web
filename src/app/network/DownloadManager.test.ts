import {
  areItemArraysEqual,
  DownloadItem,
  DownloadItemType,
  DownloadManagerService,
  DownloadTask,
  isLostConnectionError,
} from 'app/drive/services/downloadManager.service';
import { ErrorMessages } from 'app/core/constants';
import { createFilesIterator, createFoldersIterator } from 'app/drive/services/folder.service';
import { DriveFileData, DriveFolderData, DriveItemData } from 'app/drive/types';
import tasksService from 'app/tasks/services/tasks.service';
import { QueueUtilsService } from 'utils/queueUtils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DownloadManager } from './DownloadManager';
import { EncryptionVersion, FileStatus } from '@internxt/sdk/dist/drive/storage/types';
import { ConnectionLostError } from './requests';
import errorService from 'services/error.service';
import { TaskData, TaskStatus } from 'app/tasks/types';
import retryManager, { RetryableTask } from './RetryManager';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';

const MOCK_TRANSLATION_MESSAGE = 'Test translation message';

vi.mock('app/drive/services/folder.service', () => ({
  default: {},
  createFilesIterator: vi.fn(),
  createFoldersIterator: vi.fn(),
}));

vi.mock('services/error.service', () => ({
  default: {
    castError: vi.fn().mockImplementation((e) => ({ message: e.message ?? 'Default error message' })),
    reportError: vi.fn(),
  },
}));

vi.mock('app/tasks/services/tasks.service', () => ({
  default: {
    updateTask: vi.fn(),
    findTask: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
}));

vi.mock('i18next', () => ({ t: () => MOCK_TRANSLATION_MESSAGE }));

vi.mock('app/drive/services/downloadManager.service', () => ({
  DownloadManagerService: {
    instance: {
      generateTasksForItem: vi.fn(),
      downloadFolder: vi.fn(),
      downloadFile: vi.fn(),
      downloadItems: vi.fn(),
    },
  },
  isLostConnectionError: vi.fn(),
  areItemArraysEqual: vi.fn(),
}));

describe('downloadManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
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
    vi.spyOn(QueueUtilsService.instance, 'getConcurrencyUsingPerformance').mockReturnValue(6);
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
    expect(downloadFolderSpy).toHaveBeenCalledWith(mockTask, expect.anything(), expect.anything(), expect.anything());
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
    vi.spyOn(QueueUtilsService.instance, 'getConcurrencyUsingPerformance').mockReturnValue(6);
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
    vi.spyOn(QueueUtilsService.instance, 'getConcurrencyUsingPerformance').mockReturnValue(6);
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

    vi.spyOn(QueueUtilsService.instance, 'getConcurrencyUsingPerformance').mockReturnValue(newConcurrency);

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

    vi.spyOn(QueueUtilsService.instance, 'getConcurrencyUsingPerformance').mockReturnValue(newConcurrency);

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

    await expect(downloadPromise).rejects.toThrow();
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
    vi.spyOn(QueueUtilsService.instance, 'getConcurrencyUsingPerformance').mockReturnValue(6);
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
    vi.spyOn(QueueUtilsService.instance, 'getConcurrencyUsingPerformance').mockReturnValue(6);
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

    expect(errorServiceSpy).toHaveBeenCalledWith(testError);
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
    vi.spyOn(QueueUtilsService.instance, 'getConcurrencyUsingPerformance').mockReturnValue(6);
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

    expect(errorServiceSpy).toHaveBeenCalledWith(testError);
    expect(downloadFileSpy).not.toHaveBeenCalled();
    expect(downloadFolderSpy).toHaveBeenCalledWith(mockTask, expect.anything(), expect.anything(), expect.anything());
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

  describe('downloadTask', () => {
    it('should update task status to Error when all items fail (failedItems > 0)', async () => {
      const mockTask = { id: 'task-1', status: TaskStatus.InProcess } as TaskData;
      vi.spyOn(tasksService, 'findTask').mockReturnValue(mockTask);

      const downloadTask = {
        items: [
          { id: 123, isFolder: false },
          { id: 234, isFolder: true },
        ] as DownloadItemType[],
        taskId: 'task-1',
        abortController: new AbortController(),
        options: {
          showErrors: true,
        },
        failedItems: [
          { id: 123, isFolder: false },
          { id: 234, isFolder: true },
        ] as DownloadItemType[],
      } as DownloadTask;

      const updateTaskSpy = vi.spyOn(tasksService, 'updateTask');

      const downloadItemsSpy = vi.spyOn(DownloadManagerService.instance, 'downloadItems').mockResolvedValue();
      vi.mocked(areItemArraysEqual).mockReturnValueOnce(true);

      await expect(DownloadManager['downloadTask'](downloadTask)).rejects.toThrow(ErrorMessages.ServerUnavailable);

      expect(updateTaskSpy).toHaveBeenCalledWith({
        taskId: 'task-1',
        merge: { status: TaskStatus.Error },
      });
      expect(downloadItemsSpy).toHaveBeenCalled();
    });

    it('should not throw an error if only some items fail (failedItems > 0 but not all)', async () => {
      const mockTask = { id: 'task-2', status: TaskStatus.InProcess } as TaskData;
      vi.spyOn(tasksService, 'findTask').mockReturnValue(mockTask);

      const downloadTask = {
        items: [
          { id: 123, isFolder: false },
          { id: 234, isFolder: true },
        ] as DownloadItemType[],
        taskId: 'task-2',
        abortController: new AbortController(),
        options: {
          showErrors: true,
        },
        failedItems: [{ id: 123, isFolder: false }] as DownloadItemType[],
      } as DownloadTask;

      const updateTaskSpy = vi.spyOn(tasksService, 'updateTask');

      const downloadItemsSpy = vi.spyOn(DownloadManagerService.instance, 'downloadItems').mockResolvedValue();

      await expect(DownloadManager['downloadTask'](downloadTask)).resolves.not.toThrow();

      expect(updateTaskSpy).toHaveBeenCalledWith({
        taskId: 'task-2',
        merge: { status: TaskStatus.Success },
      });
      expect(downloadItemsSpy).toHaveBeenCalled();
    });
  });

  describe('removeRetryItems', () => {
    it('should remove retry items that are not in the failed items list', () => {
      const items = [
        { id: 1, isFolder: false },
        { id: 2, isFolder: true },
        { id: 3, isFolder: false },
      ] as DownloadItemType[];

      const downloadTask = {
        taskId: 'task-1',
        failedItems: [{ id: 2, isFolder: true }],
      } as DownloadTask;

      const removeTaskSpy = vi.spyOn(retryManager, 'removeTaskByIdAndParams');

      DownloadManager['removeRetryItems'](items, downloadTask);

      expect(removeTaskSpy).toHaveBeenCalledTimes(2);
      expect(removeTaskSpy).toHaveBeenCalledWith('task-1', { id: 1 });
      expect(removeTaskSpy).toHaveBeenCalledWith('task-1', { id: 3 });
    });

    it('should not remove any retry items if all items are in the failed items list', () => {
      const items = [
        { id: 1, isFolder: false },
        { id: 2, isFolder: true },
      ] as DownloadItemType[];

      const downloadTask = {
        taskId: 'task-2',
        failedItems: [
          { id: 1, isFolder: false },
          { id: 2, isFolder: true },
        ],
      } as DownloadTask;

      const removeTaskSpy = vi.spyOn(retryManager, 'removeTaskByIdAndParams');

      DownloadManager['removeRetryItems'](items, downloadTask);

      expect(removeTaskSpy).not.toHaveBeenCalled();
    });

    it('should handle an empty failed items list', () => {
      const items = [
        { id: 1, isFolder: false },
        { id: 2, isFolder: true },
      ] as DownloadItemType[];

      const downloadTask = {
        taskId: 'task-3',
        failedItems: [] as DownloadItemType[],
      } as DownloadTask;

      const removeTaskSpy = vi.spyOn(retryManager, 'removeTaskByIdAndParams').mockReturnValue();

      DownloadManager['removeRetryItems'](items, downloadTask);

      expect(removeTaskSpy).toHaveBeenCalledTimes(2);
      expect(removeTaskSpy).toHaveBeenCalledWith('task-3', { id: 1 });
      expect(removeTaskSpy).toHaveBeenCalledWith('task-3', { id: 2 });
    });

    it('should handle an empty items list', () => {
      const items: DownloadItemType[] = [];

      const downloadTask = {
        taskId: 'task-4',
        failedItems: [{ id: 1, isFolder: false }],
      } as DownloadTask;

      const removeTaskSpy = vi.spyOn(retryManager, 'removeTaskByIdAndParams').mockReturnValue();

      DownloadManager['removeRetryItems'](items, downloadTask);

      expect(removeTaskSpy).not.toHaveBeenCalled();
    });
  });

  describe('reportError', () => {
    it('should update task status to Error and throw connection lost error', () => {
      const mockTaskId = 'task-1';
      const mockError = new ConnectionLostError();
      const mockDownloadTask = {
        taskId: mockTaskId,
        items: [] as DownloadItemType[],
        options: { showErrors: true },
      } as DownloadTask;

      const updateTaskSpy = vi.spyOn(tasksService, 'updateTask');
      vi.mocked(isLostConnectionError).mockReturnValueOnce(true);

      expect(() => {
        DownloadManager['reportError'](mockError, mockDownloadTask);
      }).toThrow(mockError);

      expect(updateTaskSpy).toHaveBeenCalledWith({
        taskId: mockTaskId,
        merge: { status: TaskStatus.Error, subtitle: MOCK_TRANSLATION_MESSAGE },
      });
    });

    it('should handle server error and remove retry items', () => {
      const mockTaskId = 'task-2';
      const mockError = new Error(ErrorMessages.ServerUnavailable);
      const mockItems = [{ id: 1, isFolder: false }];
      const mockDownloadTask = {
        taskId: mockTaskId,
        items: mockItems,
        options: { showErrors: true },
      } as DownloadTask;

      const updateTaskSpy = vi.spyOn(tasksService, 'updateTask');
      const retryTaskSpy = vi.spyOn(retryManager, 'getTasksById').mockReturnValueOnce([]);

      DownloadManager['reportError'](mockError, mockDownloadTask);

      expect(retryTaskSpy).toHaveBeenCalledWith(mockTaskId);
      expect(updateTaskSpy).toHaveBeenCalledWith({
        taskId: mockTaskId,
        merge: { status: TaskStatus.Error },
      });
    });

    it('should handle server error when retry task has elements', () => {
      const mockTaskId = 'task-2';
      const mockError = new Error(ErrorMessages.ServerUnavailable);
      const mockItems = [{ id: 1, isFolder: false }];
      const mockDownloadTask = {
        taskId: mockTaskId,
        items: mockItems,
        options: { showErrors: true },
      } as DownloadTask;

      const updateTaskSpy = vi.spyOn(tasksService, 'updateTask');
      const retryTaskSpy = vi.spyOn(retryManager, 'getTasksById').mockReturnValueOnce([
        {
          taskId: mockTaskId,
          type: 'download',
          params: { id: 1, isFolder: false },
        } as RetryableTask,
      ]);

      DownloadManager['reportError'](mockError, mockDownloadTask);

      expect(retryTaskSpy).toHaveBeenCalledWith(mockTaskId);
      expect(updateTaskSpy).toHaveBeenCalledWith({
        taskId: mockTaskId,
        merge: { status: TaskStatus.Success },
      });
    });

    it('should report folder error with extra details', () => {
      const mockTaskId = 'task-3';
      const mockError = new Error('Folder error');
      const mockPartialFolder = { id: 1, isFolder: true, name: 'Folder1', bucket: 'bucket1', parentId: 0 };
      const mockItems = [mockPartialFolder];
      const mockDownloadTask = {
        taskId: mockTaskId,
        items: mockItems,
        options: { showErrors: true },
      } as DownloadTask;

      const updateTaskSpy = vi.spyOn(tasksService, 'updateTask');
      const findTaskSpy = vi.spyOn(tasksService, 'findTask').mockReturnValue({
        id: mockTaskId,
        status: TaskStatus.Success,
      } as TaskData);
      const errorServiceSpy = vi.spyOn(errorService, 'reportError');

      DownloadManager['reportError'](mockError, mockDownloadTask);

      expect(errorServiceSpy).toHaveBeenCalledWith(mockError);
      expect(updateTaskSpy).toHaveBeenCalledWith({
        taskId: mockTaskId,
        merge: { status: TaskStatus.Error },
      });
      expect(findTaskSpy).toHaveBeenCalledWith(mockTaskId);
    });

    it('should report file error with extra details', () => {
      const mockTaskId = 'task-4';
      const mockError = new Error('File error');
      const mockPartialFile = { id: 1, isFolder: false, name: 'File1', bucket: 'bucket1', size: 100, type: 'jpg' };
      const mockItems = [mockPartialFile];
      const mockDownloadTask = {
        taskId: mockTaskId,
        items: mockItems,
        options: { showErrors: true },
      } as DownloadTask;

      const updateTaskSpy = vi.spyOn(tasksService, 'updateTask');
      const findTaskSpy = vi.spyOn(tasksService, 'findTask').mockReturnValue({
        id: mockTaskId,
        status: TaskStatus.Success,
      } as TaskData);
      const errorServiceSpy = vi.spyOn(errorService, 'reportError');

      DownloadManager['reportError'](mockError, mockDownloadTask);

      expect(errorServiceSpy).toHaveBeenCalledWith(mockError);
      expect(updateTaskSpy).toHaveBeenCalledWith({
        taskId: mockTaskId,
        merge: { status: TaskStatus.Error },
      });
      expect(findTaskSpy).toHaveBeenCalledWith(mockTaskId);
    });

    it('should show error notification if showErrors is true', () => {
      const mockTaskId = 'task-5';
      const mockError = new Error('Notification error');
      const mockItems = [{ id: 1, isFolder: false }];
      const mockDownloadTask = {
        taskId: mockTaskId,
        items: mockItems,
        options: { showErrors: true },
      } as DownloadTask;
      const notificationsServiceSpy = vi.spyOn(notificationsService, 'show');

      DownloadManager['reportError'](mockError, mockDownloadTask);

      expect(notificationsServiceSpy).toHaveBeenCalledWith({
        text: MOCK_TRANSLATION_MESSAGE,
        type: ToastType.Error,
      });
    });

    it('should update task status to Cancelled if task is cancelled', () => {
      const mockTaskId = 'task-6';
      const mockError = new Error('Cancelled error');
      const mockDownloadTask = {
        taskId: mockTaskId,
        items: [] as DownloadItemType[],
        options: { showErrors: true },
      } as DownloadTask;

      vi.spyOn(tasksService, 'findTask').mockReturnValue({
        id: mockTaskId,
        status: TaskStatus.Cancelled,
      } as TaskData);

      const updateTaskSpy = vi.spyOn(tasksService, 'updateTask');

      DownloadManager['reportError'](mockError, mockDownloadTask);

      expect(updateTaskSpy).toHaveBeenCalledWith({
        taskId: mockTaskId,
        merge: { status: TaskStatus.Cancelled },
      });
    });
  });
});
