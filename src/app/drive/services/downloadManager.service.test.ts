import streamSaver from '../../../libs/streamSaver';
import {
  DownloadCredentials,
  DownloadItem,
  DownloadItemType,
  DownloadManagerService,
  DownloadTask,
  areItemArraysEqual,
} from 'app/drive/services/downloadManager.service';
import { ErrorMessages } from 'app/core/constants';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, Mock, MockInstance, test, vi } from 'vitest';
import { Workspace, WorkspaceCredentialsDetails, WorkspaceData, WorkspaceUser } from '@internxt/sdk/dist/workspaces';
import { DriveFileData, DriveFolderData, DriveItemData } from '../types';
import {
  checkIfCachedSourceIsOlder,
  createFilesIterator,
  createFoldersIterator,
  downloadFolderAsZip,
} from './folder.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import localStorageService from 'services/local-storage.service';
import tasksService from 'app/tasks/services/tasks.service';
import { EncryptionVersion, FileStatus } from '@internxt/sdk/dist/drive/storage/types';
import { TaskStatus, TaskType } from 'app/tasks/types';
import downloadService from './download.service';
import { getDatabaseFileSourceData, updateDatabaseFileSourceData } from './database.service';
import { FlatFolderZip } from 'services/zip.service';
import { binaryStreamToBlob } from 'services/stream.service';
import { LevelsBlobsCache, LRUFilesCacheManager } from 'app/database/services/database.service/LRUFilesCacheManager';
import { LRUCache } from 'app/database/services/database.service/LRUCache';
import { DriveItemBlobData } from 'app/database/services/database.service';
import { ConnectionLostError } from 'app/network/requests';
import { downloadFile } from 'app/network/download';
import { downloadWorkerHandler } from './worker.service/downloadWorkerHandler';
import deviceService from 'services/device.service';

vi.mock('./../../network/requests', () => ({ ConnectionLostError: vi.fn(), NetworkCredentials: {} }));
vi.mock('app/tasks/services/tasks.service', () => ({
  default: {
    create: vi.fn(),
    updateTask: vi.fn(),
  },
}));
vi.mock('services/error.service', () => ({
  default: {
    castError: vi.fn().mockImplementation((e) => ({ message: e.message ?? 'Default error message' })),
    reportError: vi.fn(),
  },
}));
vi.mock('file-saver', async () => {
  const actual = await vi.importActual<typeof import('file-saver')>('file-saver');
  return {
    ...actual,
    saveAs: vi.fn(),
  };
});
vi.mock('src/app/network/NetworkFacade.ts', () => ({
  NetworkFacade: vi.fn().mockImplementation(() => ({
    downloadFile: vi.fn(),
    downloadFolder: vi.fn(),
    downloadItems: vi.fn(),
    generateTasksForItem: vi.fn(),
  })),
}));

vi.mock('app/drive/services/database.service', () => ({
  canFileBeCached: vi.fn(),
  deleteDatabaseItems: vi.fn(),
  deleteDatabaseProfileAvatar: vi.fn(),
  deleteDatabaseWorkspaceAvatar: vi.fn(),
  getDatabaseFilePreviewData: vi.fn(),
  getDatabaseFileSourceData: vi.fn(),
  getDatabaseProfileAvatar: vi.fn(),
  getDatabaseWorkspaceAvatar: vi.fn(),
  updateDatabaseFilePreviewData: vi.fn(),
  updateDatabaseFileSourceData: vi.fn(),
  updateDatabaseProfileAvatar: vi.fn(),
  updateDatabaseWorkspaceAvatar: vi.fn(),
}));

vi.mock('./folder.service', () => ({
  downloadFolderAsZip: vi.fn(),
  createFilesIterator: vi.fn(),
  createFoldersIterator: vi.fn(),
  checkIfCachedSourceIsOlder: vi.fn(),
}));

vi.mock('app/network/download', () => ({
  downloadFile: vi.fn(),
  NetworkCredentials: vi.fn(),
}));

vi.mock('services/stream.service', () => ({
  binaryStreamToBlob: vi.fn(),
  buildProgressStream: vi.fn(),
  decryptStream: vi.fn(),
  joinReadableBinaryStreams: vi.fn(),
}));

vi.mock('services/local-storage.service', () => ({
  default: {
    getUser: vi.fn(),
  },
}));
vi.mock('./download.service/createFileDownloadStream');

describe('downloadManagerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    const defaultWritableStream = new WritableStream({
      write: vi.fn(),
      close: vi.fn(),
      abort: vi.fn(),
    });
    vi.spyOn(streamSaver, 'createWriteStream').mockReturnValue(defaultWritableStream);
  });

  const mockWorker = {
    postMessage: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    terminate: vi.fn(),
  } as unknown as Worker;

  const mockSharingOptions = {
    credentials: { user: 'test-user', pass: 'test-pass' },
    mnemonic: 'test-mnemonic',
  };

  const mockUser: UserSettings = {
    uuid: 'mock-uuid',
    email: 'mock-email',
    privateKey: 'privateKeyEncrypted',
    mnemonic: 'encryptedMockMnemonic',
    userId: 'mock-userId',
    name: 'mock-name',
    lastname: 'mock-lastname',
    username: 'mock-username',
    bridgeUser: 'mock-bridgeUser',
    bucket: 'mock-bucket',
    backupsBucket: null,
    root_folder_id: 0,
    rootFolderId: 'mock-rootFolderId',
    rootFolderUuid: undefined,
    sharedWorkspace: false,
    credit: 0,
    publicKey: 'publicKey',
    revocationKey: 'revocationCertificate',
    keys: {
      ecc: {
        publicKey: 'keys.ecc.publicKey',
        privateKey: 'keys.ecc.privateKeyEncrypted',
      },
      kyber: {
        publicKey: 'keys.kyber.publicKey',
        privateKey: 'keys.kyber.privateKeyEncrypted',
      },
    },
    appSumoDetails: null,
    registerCompleted: false,
    hasReferralsProgram: false,
    createdAt: new Date(),
    avatar: null,
    emailVerified: false,
  };
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

  it('should return download credentials from workspace', () => {
    const workspace = {
      id: 'workspace-data-id',
    } as Workspace;
    const workspaceUser = {
      key: 'workspace-user-key',
    } as WorkspaceUser;

    const mockWorkspace: WorkspaceData = {
      workspace,
      workspaceUser,
    };

    const mockWorkspaceCredentials: WorkspaceCredentialsDetails = {
      credentials: {
        networkUser: 'workspaceUser',
        networkPass: 'workspacePass',
      },
      bucket: '',
      email: '',
      tokenHeader: '',
      workspaceId: '',
      workspaceUserId: '',
    };

    const expectedResult: DownloadCredentials = {
      credentials: {
        user: mockWorkspaceCredentials.credentials.networkUser,
        pass: mockWorkspaceCredentials.credentials.networkPass,
      },
      workspaceId: mockWorkspace.workspace.id,
      mnemonic: mockWorkspace.workspaceUser.key,
    };

    const result = DownloadManagerService.instance.getDownloadCredentialsFromWorkspace(
      mockWorkspace,
      mockWorkspaceCredentials,
    );

    expect(expectedResult).toEqual(result);
  });

  it('should return undefined if there are not credentials from workspace', () => {
    const workspace = {
      id: 'workspace-data-id',
    } as Workspace;
    const workspaceUser = {
      key: 'workspace-user-key',
    } as WorkspaceUser;

    const mockWorkspace: WorkspaceData = {
      workspace,
      workspaceUser,
    };

    const mockWorkspaceCredentials: WorkspaceCredentialsDetails = {
      credentials: {
        networkUser: 'workspaceUser',
        networkPass: 'workspacePass',
      },
      bucket: '',
      email: '',
      tokenHeader: '',
      workspaceId: '',
      workspaceUserId: '',
    };

    expect(
      DownloadManagerService.instance.getDownloadCredentialsFromWorkspace(null, mockWorkspaceCredentials),
    ).toBeUndefined();
    expect(DownloadManagerService.instance.getDownloadCredentialsFromWorkspace(mockWorkspace, null)).toBeUndefined();
  });

  it('should not generate a download task if there is no download item', async () => {
    const downloadItem: DownloadItem = {
      payload: [],
      selectedWorkspace: null,
      workspaceCredentials: null,
    };

    const task = await DownloadManagerService.instance.generateTasksForItem(downloadItem);
    expect(task).toBeUndefined();
  });

  it('should generate a download task from a download file', async () => {
    const downloadItem: DownloadItem = {
      payload: [mockFile as DriveItemData],
      selectedWorkspace: null,
      workspaceCredentials: null,
    };
    const mockTaskId = 'mock-task-id';

    vi.spyOn(localStorageService, 'getUser').mockReturnValue(mockUser);
    const createTaskSpy = vi.spyOn(tasksService, 'create').mockReturnValue(mockTaskId);
    vi.spyOn(tasksService, 'updateTask').mockRejectedValue(new Error('It should create task'));

    const expectedTask: DownloadTask = {
      abortController: expect.anything(),
      items: downloadItem.payload,
      createFilesIterator: createFilesIterator,
      createFoldersIterator: createFoldersIterator,
      credentials: {
        credentials: {
          user: mockUser.bridgeUser,
          pass: mockUser.userId,
        },
        mnemonic: mockUser.mnemonic,
      },
      options: {
        areSharedItems: false,
        downloadName: `${mockFile.name}.${mockFile.type}`,
        showErrors: true,
      },
      taskId: mockTaskId,
      failedItems: [],
    };

    const downloadTask = await DownloadManagerService.instance.generateTasksForItem(downloadItem);

    expect(expectedTask).toEqual(downloadTask);
    expect(createTaskSpy).toHaveBeenCalledWith({
      action: TaskType.DownloadFile,
      file: mockFile,
      showNotification: true,
      cancellable: true,
      stop: expect.anything(),
    });
  });

  it('should generate a download task from a download folder', async () => {
    const downloadItem: DownloadItem = {
      payload: [mockFolder as DriveItemData],
      selectedWorkspace: null,
      workspaceCredentials: null,
    };
    const mockTaskId = 'mock-task-id';

    vi.spyOn(localStorageService, 'getUser').mockReturnValue(mockUser);
    const createTaskSpy = vi.spyOn(tasksService, 'create').mockReturnValue(mockTaskId);
    vi.spyOn(tasksService, 'updateTask').mockRejectedValue(new Error('It should create task'));

    const expectedTask: DownloadTask = {
      abortController: expect.anything(),
      items: downloadItem.payload,
      createFilesIterator: createFilesIterator,
      createFoldersIterator: createFoldersIterator,
      credentials: {
        credentials: {
          user: mockUser.bridgeUser,
          pass: mockUser.userId,
        },
        mnemonic: mockUser.mnemonic,
      },
      options: {
        areSharedItems: false,
        downloadName: mockFolder.name,
        showErrors: true,
      },
      taskId: mockTaskId,
      failedItems: [],
    };

    const downloadTask = await DownloadManagerService.instance.generateTasksForItem(downloadItem);

    expect(expectedTask).toEqual(downloadTask);
    expect(createTaskSpy).toHaveBeenCalledWith({
      action: TaskType.DownloadFolder,
      folder: mockFolder,
      compressionFormat: 'zip',
      showNotification: true,
      cancellable: true,
      stop: expect.anything(),
    });
  });

  it('should generate a download task from an array of items', async () => {
    const downloadItem: DownloadItem = {
      payload: [mockFolder as DriveItemData, mockFile as DriveItemData],
      selectedWorkspace: null,
      workspaceCredentials: null,
    };
    const mockTaskId = 'mock-task-id';

    vi.spyOn(localStorageService, 'getUser').mockReturnValue(mockUser);
    const createTaskSpy = vi.spyOn(tasksService, 'create').mockReturnValue(mockTaskId);
    vi.spyOn(tasksService, 'updateTask').mockRejectedValue(new Error('It should create task'));

    const expectedTask: DownloadTask = {
      abortController: expect.anything(),
      items: downloadItem.payload,
      createFilesIterator: createFilesIterator,
      createFoldersIterator: createFoldersIterator,
      credentials: {
        credentials: {
          user: mockUser.bridgeUser,
          pass: mockUser.userId,
        },
        mnemonic: mockUser.mnemonic,
      },
      options: {
        areSharedItems: false,
        downloadName: expect.stringContaining('Internxt'),
        showErrors: true,
      },
      taskId: mockTaskId,
      failedItems: [],
    };

    const downloadTask = await DownloadManagerService.instance.generateTasksForItem(downloadItem);

    expect(expectedTask).toEqual(downloadTask);
    expect(createTaskSpy).toHaveBeenCalledWith({
      action: TaskType.DownloadFile,
      file: {
        name: expect.stringContaining('Internxt'),
        type: 'zip',
        items: downloadItem.payload as DriveItemData[],
      },
      showNotification: true,
      cancellable: true,
      stop: expect.anything(),
    });
  });

  it('should generate a download task reusing the same task id if its present', async () => {
    const mockTaskId = 'mock-task-id';
    const downloadItem: DownloadItem = {
      taskId: mockTaskId,
      payload: [{ ...mockFile, type: '' } as DriveItemData],
      selectedWorkspace: null,
      workspaceCredentials: null,
    };

    vi.spyOn(localStorageService, 'getUser').mockReturnValue(mockUser);
    const createTaskSpy = vi.spyOn(tasksService, 'create').mockRejectedValue(new Error('It should update task'));
    const updateTaskSpy = vi.spyOn(tasksService, 'updateTask').mockReturnValue();

    const expectedTask: DownloadTask = {
      abortController: expect.anything(),
      items: downloadItem.payload,
      createFilesIterator: createFilesIterator,
      createFoldersIterator: createFoldersIterator,
      credentials: {
        credentials: {
          user: mockUser.bridgeUser,
          pass: mockUser.userId,
        },
        mnemonic: mockUser.mnemonic,
      },
      options: {
        areSharedItems: false,
        downloadName: mockFile.name,
        showErrors: true,
      },
      taskId: mockTaskId,
      failedItems: [],
    };

    const downloadTask = await DownloadManagerService.instance.generateTasksForItem(downloadItem);

    expect(expectedTask).toEqual(downloadTask);
    expect(updateTaskSpy).toHaveBeenCalledWith({
      taskId: mockTaskId,
      merge: {
        status: TaskStatus.Decrypting,
        cancellable: true,
        stop: expect.anything(),
      },
    });
    expect(createTaskSpy).not.toHaveBeenCalled();
  });

  it('should generate a download task getting credentials from parameters', async () => {
    const mockCredentials: DownloadCredentials = {
      credentials: {
        user: 'any-user',
        pass: 'any-pass',
      },
      mnemonic: 'any-mnemonic',
    };

    const downloadItem: DownloadItem = {
      payload: [mockFile as DriveItemData],
      selectedWorkspace: null,
      workspaceCredentials: null,
      downloadCredentials: mockCredentials,
    };
    const mockTaskId = 'mock-task-id';

    vi.spyOn(localStorageService, 'getUser').mockReturnValue(mockUser);
    vi.spyOn(tasksService, 'create').mockReturnValue(mockTaskId);
    vi.spyOn(tasksService, 'updateTask').mockRejectedValue(new Error('It should create task'));

    const expectedTask: DownloadTask = {
      abortController: expect.anything(),
      items: downloadItem.payload,
      createFilesIterator: createFilesIterator,
      createFoldersIterator: createFoldersIterator,
      credentials: {
        credentials: mockCredentials.credentials,
        mnemonic: mockCredentials.mnemonic,
      },
      options: {
        areSharedItems: false,
        downloadName: `${mockFile.name}.${mockFile.type}`,
        showErrors: true,
      },
      taskId: mockTaskId,
      failedItems: [],
    };

    const downloadTask = await DownloadManagerService.instance.generateTasksForItem(downloadItem);

    expect(expectedTask).toEqual(downloadTask);
  });

  it('should generate a download task getting credentials from workspace', async () => {
    const workspace = {
      id: 'workspace-data-id',
    } as Workspace;
    const workspaceUser = {
      key: 'workspace-user-key',
    } as WorkspaceUser;
    const mockWorkspace: WorkspaceData = {
      workspace,
      workspaceUser,
    };
    const mockWorkspaceCredentials: WorkspaceCredentialsDetails = {
      credentials: {
        networkUser: 'workspaceUser',
        networkPass: 'workspacePass',
      },
      bucket: '',
      email: '',
      tokenHeader: '',
      workspaceId: '',
      workspaceUserId: '',
    };

    const downloadItem: DownloadItem = {
      payload: [mockFile as DriveItemData],
      selectedWorkspace: mockWorkspace,
      workspaceCredentials: mockWorkspaceCredentials,
    };
    const mockTaskId = 'mock-task-id';

    vi.spyOn(localStorageService, 'getUser').mockReturnValue(mockUser);
    vi.spyOn(tasksService, 'create').mockReturnValue(mockTaskId);
    vi.spyOn(tasksService, 'updateTask').mockRejectedValue(new Error('It should create task'));

    const expectedTask: DownloadTask = {
      abortController: expect.anything(),
      items: downloadItem.payload,
      createFilesIterator: createFilesIterator,
      createFoldersIterator: createFoldersIterator,
      credentials: {
        credentials: {
          user: mockWorkspaceCredentials.credentials.networkUser,
          pass: mockWorkspaceCredentials.credentials.networkPass,
        },
        workspaceId: mockWorkspace.workspace.id,
        mnemonic: mockWorkspace.workspaceUser.key,
      },
      options: {
        areSharedItems: false,
        downloadName: `${mockFile.name}.${mockFile.type}`,
        showErrors: true,
      },
      taskId: mockTaskId,
      failedItems: [],
    };

    const downloadTask = await DownloadManagerService.instance.generateTasksForItem(downloadItem);

    expect(expectedTask).toEqual(downloadTask);
  });

  it('should downloadFolder updating task successfully', async () => {
    const mockTaskId = 'mock-task-id';
    const downloadItem: DownloadItem = {
      payload: [mockFolder as DriveItemData],
      selectedWorkspace: null,
      workspaceCredentials: null,
    };

    const mockTask: DownloadTask = {
      abortController: new AbortController(),
      items: downloadItem.payload,
      createFilesIterator: createFilesIterator,
      createFoldersIterator: createFoldersIterator,
      credentials: {
        credentials: {
          user: 'any-user',
          pass: 'any-pass',
        },
        workspaceId: 'any-workspace-id',
        mnemonic: 'any-mnemonic',
      },
      options: {
        areSharedItems: false,
        downloadName: `${mockFile.name}.${mockFile.type}`,
        showErrors: true,
      },
      taskId: mockTaskId,
      failedItems: [],
    };
    const mockUpdateProgress = vi.fn((progress: number) => progress);
    const mockIncrementItemCount = vi.fn(() => 0);

    const updateTaskSpy = vi.spyOn(tasksService, 'updateTask').mockReturnValue();

    const downloadFolderItemSpy = vi.fn();
    (downloadFolderAsZip as Mock).mockImplementation(downloadFolderItemSpy);

    const handleConnectionLostSpy = vi.spyOn(DownloadManagerService.instance, 'handleConnectionLost');
    const checkAndHandleConnectionLossSpy = vi.spyOn(DownloadManagerService.instance, 'checkAndHandleConnectionLost');

    await DownloadManagerService.instance.downloadFolder(mockTask, mockUpdateProgress, mockIncrementItemCount);

    expect(updateTaskSpy).toHaveBeenCalledWith({
      taskId: mockTaskId,
      merge: {
        status: TaskStatus.InProcess,
        progress: Infinity,
        nItems: 0,
      },
    });
    expect(downloadFolderItemSpy).toHaveBeenCalledWith({
      folder: mockFolder,
      isSharedFolder: mockTask.options.areSharedItems,
      foldersIterator: mockTask.createFoldersIterator,
      filesIterator: mockTask.createFilesIterator,
      updateProgress: expect.anything(),
      updateNumItems: mockIncrementItemCount,
      options: {
        closeWhenFinished: true,
        ...mockTask.credentials,
      },
      abortController: mockTask.abortController,
    });
    expect(handleConnectionLostSpy).toHaveBeenCalledWith(5000);
    expect(checkAndHandleConnectionLossSpy).toHaveBeenCalled();
  });

  it('should downloadFolder keep working if some files fails', async () => {
    const mockTaskId = 'mock-task-id';
    const mockTask: DownloadTask = {
      abortController: new AbortController(),
      items: [mockFolder as DriveItemData],
      createFilesIterator: createFilesIterator,
      createFoldersIterator: createFoldersIterator,
      credentials: {
        credentials: {
          user: 'any-user',
          pass: 'any-pass',
        },
        workspaceId: 'any-workspace-id',
        mnemonic: 'any-mnemonic',
      },
      options: {
        areSharedItems: false,
        downloadName: `${mockFile.name}.${mockFile.type}`,
        showErrors: true,
      },
      taskId: mockTaskId,
      failedItems: [],
    };
    const mockFile2: DriveFileData = { ...mockFile, id: 2, name: 'File2' };

    const mockUpdateProgress = vi.fn((progress: number) => progress);
    const mockIncrementItemCount = vi.fn(() => 0);

    (downloadFolderAsZip as Mock).mockImplementationOnce(
      vi.fn(() => ({
        totalItems: mockTask.items,
        failedItems: [mockFile, mockFile2],
        allItemsFailed: false,
      })),
    );

    const handleConnectionLostSpy = vi.spyOn(DownloadManagerService.instance, 'handleConnectionLost');
    const checkAndHandleConnectionLossSpy = vi.spyOn(DownloadManagerService.instance, 'checkAndHandleConnectionLost');

    await DownloadManagerService.instance.downloadFolder(mockTask, mockUpdateProgress, mockIncrementItemCount);

    expect(mockTask.failedItems).toEqual([mockFile, mockFile2]);
    expect(handleConnectionLostSpy).toHaveBeenCalledWith(5000);
    expect(checkAndHandleConnectionLossSpy).toHaveBeenCalled();
  });

  it('should downloadFolder throw ServerUnavailable if all files inside the folder fails', async () => {
    const mockTaskId = 'mock-task-id';
    const mockTask: DownloadTask = {
      abortController: new AbortController(),
      items: [mockFolder as DriveItemData],
      createFilesIterator: createFilesIterator,
      createFoldersIterator: createFoldersIterator,
      credentials: {
        credentials: {
          user: 'any-user',
          pass: 'any-pass',
        },
        workspaceId: 'any-workspace-id',
        mnemonic: 'any-mnemonic',
      },
      options: {
        areSharedItems: false,
        downloadName: `${mockFile.name}.${mockFile.type}`,
        showErrors: true,
      },
      taskId: mockTaskId,
      failedItems: [],
    };

    const mockUpdateProgress = vi.fn((progress: number) => progress);
    const mockIncrementItemCount = vi.fn(() => 0);

    (downloadFolderAsZip as Mock).mockImplementationOnce(
      vi.fn(() => ({
        allItemsFailed: true,
      })),
    );

    const handleConnectionLostSpy = vi.spyOn(DownloadManagerService.instance, 'handleConnectionLost');
    const checkAndHandleConnectionLossSpy = vi.spyOn(DownloadManagerService.instance, 'checkAndHandleConnectionLost');

    await expect(
      DownloadManagerService.instance.downloadFolder(mockTask, mockUpdateProgress, mockIncrementItemCount),
    ).rejects.toThrow(ErrorMessages.ServerUnavailable);

    expect(mockTask.failedItems).toEqual([]);
    expect(handleConnectionLostSpy).toHaveBeenCalledWith(5000);
    expect(checkAndHandleConnectionLossSpy).toHaveBeenCalled();
  });

  it('should handle connection loss during downloadFolder', async () => {
    const mockTask: DownloadTask = {
      abortController: new AbortController(),
      items: [mockFolder as DriveItemData],
      createFilesIterator: createFilesIterator,
      createFoldersIterator: createFoldersIterator,
      credentials: {
        credentials: {
          user: 'any-user',
          pass: 'any-pass',
        },
        mnemonic: 'any-mnemonic',
      },
      options: {
        areSharedItems: false,
        downloadName: mockFolder.name,
        showErrors: true,
      },
      taskId: 'mock-task-id',
      failedItems: [],
    };

    const mockUpdateProgress = vi.fn();
    const mockIncrementItemCount = vi.fn();

    const handleConnectionLostSpy = vi
      .spyOn(DownloadManagerService.instance, 'handleConnectionLost')
      .mockReturnValueOnce({
        connectionLost: true,
        cleanup: vi.fn(),
      });

    (downloadFolderAsZip as Mock).mockImplementationOnce(() => {
      throw new ConnectionLostError();
    });

    await expect(
      DownloadManagerService.instance.downloadFolder(mockTask, mockUpdateProgress, mockIncrementItemCount),
    ).rejects.toThrow(ConnectionLostError);

    expect(handleConnectionLostSpy).toHaveBeenCalledWith(5000);
  });

  it('should downloadFile from task using cache', async () => {
    const mockTaskId = 'mock-task-id';
    const downloadItem: DownloadItem = {
      payload: [mockFile as DriveItemData],
      selectedWorkspace: null,
      workspaceCredentials: null,
    };

    const mockTask: DownloadTask = {
      abortController: new AbortController(),
      items: downloadItem.payload,
      createFilesIterator: createFilesIterator,
      createFoldersIterator: createFoldersIterator,
      credentials: {
        credentials: {
          user: 'any-user',
          pass: 'any-pass',
        },
        workspaceId: 'any-workspace-id',
        mnemonic: 'any-mnemonic',
      },
      options: {
        areSharedItems: false,
        downloadName: `${mockFile.name}.${mockFile.type}`,
        showErrors: true,
      },
      taskId: mockTaskId,
      failedItems: [],
    };
    const mockUpdateProgress = vi.fn((progress: number) => progress);

    const getDatabaseFileSourceDataSpy = vi.fn(() => {
      return { source: new Blob([]) };
    });
    const checkIfCachedSourceIsOlderSpy = vi.fn(() => false);

    (getDatabaseFileSourceData as Mock).mockImplementation(getDatabaseFileSourceDataSpy);
    (checkIfCachedSourceIsOlder as Mock).mockImplementation(checkIfCachedSourceIsOlderSpy);

    const downloadFileSpy = vi
      .spyOn(downloadService, 'downloadFile')
      .mockRejectedValue(new Error('It should download from cache'));

    await DownloadManagerService.instance.downloadFile(mockTask, mockUpdateProgress);

    expect(getDatabaseFileSourceDataSpy).toHaveBeenCalledWith({
      fileId: mockFile.id,
    });
    expect(checkIfCachedSourceIsOlderSpy).toHaveBeenCalledOnce();
    expect(mockUpdateProgress).toHaveBeenCalledWith(1);
    expect(downloadFileSpy).not.toHaveBeenCalled();
  });

  describe('Downloading file from network', () => {
    const mockTaskId = 'mock-task-id';
    const downloadItem: DownloadItem = {
      payload: [mockFile as DriveItemData],
      selectedWorkspace: null,
      workspaceCredentials: null,
    };

    const mockTask: DownloadTask = {
      abortController: new AbortController(),
      items: downloadItem.payload,
      createFilesIterator: createFilesIterator,
      createFoldersIterator: createFoldersIterator,
      credentials: {
        credentials: {
          user: 'any-user',
          pass: 'any-pass',
        },
        workspaceId: 'any-workspace-id',
        mnemonic: 'any-mnemonic',
      },
      options: {
        areSharedItems: false,
        downloadName: `${mockFile.name}.${mockFile.type}`,
        showErrors: true,
      },
      taskId: mockTaskId,
      failedItems: [],
    };

    test('When the download is for any browser, then should download the file from the worker', async () => {
      const mockUpdateProgress = vi.fn((progress: number) => progress);

      vi.mocked(getDatabaseFileSourceData).mockResolvedValue({ source: null } as any);
      vi.mocked(checkIfCachedSourceIsOlder).mockReturnValue(true);

      const downloadFileFromWorkerSpy = vi
        .spyOn(DownloadManagerService.instance, 'downloadFileFromWorker')
        .mockResolvedValueOnce(mockFile.fileId);

      await DownloadManagerService.instance.downloadFile(mockTask, mockUpdateProgress);

      expect(getDatabaseFileSourceData).toHaveBeenCalledWith({
        fileId: mockFile.id,
      });
      expect(checkIfCachedSourceIsOlder).toHaveBeenCalledOnce();
      expect(downloadFileFromWorkerSpy).toHaveBeenCalledWith({
        file: mockFile,
        isWorkspace: !!mockTask.credentials.workspaceId,
        updateProgressCallback: mockUpdateProgress,
        abortController: mockTask.abortController,
        sharingOptions: mockTask.credentials,
      });
    });

    describe('Safari downloads', () => {
      beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(deviceService, 'isSafari').mockReturnValue(true);
      });

      afterEach(() => {
        vi.unstubAllGlobals();
        vi.clearAllMocks();
      });

      test('When the file has type, then the download is done with the default method', async () => {
        const mockUpdateProgress = vi.fn((progress: number) => progress);

        vi.mocked(getDatabaseFileSourceData).mockResolvedValue({ source: null } as any);
        vi.mocked(checkIfCachedSourceIsOlder).mockReturnValue(true);
        vi.spyOn(downloadWorkerHandler, 'getWorker').mockReturnValue(mockWorker);
        vi.spyOn(downloadWorkerHandler, 'handleWorkerMessages').mockResolvedValue(() => {});

        await DownloadManagerService.instance.downloadFile(mockTask, mockUpdateProgress);

        expect(getDatabaseFileSourceData).toHaveBeenCalledWith({
          fileId: mockFile.id,
        });
        expect(checkIfCachedSourceIsOlder).toHaveBeenCalledOnce();
        expect(mockWorker.postMessage).toHaveBeenCalledWith({
          type: 'download',
          params: {
            file: mockFile,
            isWorkspace: !!mockTask.credentials.workspaceId,
            credentials: mockTask.credentials,
            shouldDownloadUsingBlob: false,
          },
        });
      });

      test('When the file does not have a type, then the download is done using blob', async () => {
        const mockUpdateProgress = vi.fn((progress: number) => progress);

        const fileWithoutType: DriveFileData = { ...mockFile, type: null as any };
        const taskWithFileWithoutType: DownloadTask = {
          ...mockTask,
          items: [fileWithoutType as DriveItemData],
        };

        vi.mocked(getDatabaseFileSourceData).mockResolvedValue({ source: null } as any);
        vi.mocked(checkIfCachedSourceIsOlder).mockReturnValue(true);
        vi.spyOn(downloadWorkerHandler, 'getWorker').mockReturnValue(mockWorker);
        vi.spyOn(downloadWorkerHandler, 'handleWorkerMessages').mockResolvedValue(() => {});

        await DownloadManagerService.instance.downloadFile(taskWithFileWithoutType, mockUpdateProgress);

        expect(getDatabaseFileSourceData).toHaveBeenCalledWith({
          fileId: fileWithoutType.id,
        });
        expect(checkIfCachedSourceIsOlder).toHaveBeenCalledOnce();
        expect(mockWorker.postMessage).toHaveBeenCalledWith({
          type: 'download',
          params: {
            file: fileWithoutType,
            isWorkspace: !!taskWithFileWithoutType.credentials.workspaceId,
            credentials: taskWithFileWithoutType.credentials,
            shouldDownloadUsingBlob: true,
          },
        });
      });
    });

    test('When the file size is 0, then it should save an empty blob without downloading', async () => {
      const emptyBlob = new Blob([]);
      const { saveAs } = await import('file-saver');
      const emptyFile: DriveFileData = { ...mockFile, id: 4, name: 'EmptyFile', size: 0 };
      const emptyFileTask: DownloadTask = {
        abortController: new AbortController(),
        items: [emptyFile as DriveItemData],
        createFilesIterator: createFilesIterator,
        createFoldersIterator: createFoldersIterator,
        credentials: {
          credentials: {
            user: 'any-user',
            pass: 'any-pass',
          },
          mnemonic: 'any-mnemonic',
        },
        options: {
          areSharedItems: false,
          downloadName: `${emptyFile.name}.${emptyFile.type}`,
          showErrors: true,
        },
        taskId: 'mock-task-id',
        failedItems: [],
      };

      const mockUpdateProgress = vi.fn();

      const downloadFileFromWorkerSpy = vi.spyOn(DownloadManagerService.instance, 'downloadFileFromWorker');

      await DownloadManagerService.instance.downloadFile(emptyFileTask, mockUpdateProgress);

      expect(saveAs).toHaveBeenCalledWith(emptyBlob, `${emptyFile.name}.${emptyFile.type}`);
      expect(downloadFileFromWorkerSpy).not.toHaveBeenCalled();
    });
  });

  it('should download folder items from task as zip using download service', async () => {
    const mockTaskId = 'mock-task-id';
    const mockFolder2: DriveFolderData = { ...mockFolder, name: 'folder2' };
    const downloadItem: DownloadItem = {
      payload: [mockFolder as DriveItemData, mockFolder2 as DriveItemData],
      selectedWorkspace: null,
      workspaceCredentials: null,
    };
    const mockTask: DownloadTask = {
      abortController: new AbortController(),
      items: downloadItem.payload,
      createFilesIterator: createFilesIterator,
      createFoldersIterator: createFoldersIterator,
      credentials: {
        credentials: {
          user: 'any-user',
          pass: 'any-pass',
        },
        workspaceId: 'any-workspace-id',
        mnemonic: 'any-mnemonic',
      },
      options: {
        areSharedItems: false,
        downloadName: `${mockFile.name}.${mockFile.type}`,
        showErrors: true,
      },
      taskId: mockTaskId,
      failedItems: [],
    };
    const mockUpdateProgress = vi.fn((progress: number) => progress);
    const mockIncrementItemCount = vi.fn(() => 0);

    vi.spyOn(FlatFolderZip.prototype, 'abort').mockImplementation(() => {});
    const closeZipSpy = vi.spyOn(FlatFolderZip.prototype, 'close').mockResolvedValue();

    const downloadFolderSpy = vi.fn(() => {
      return Promise.resolve({
        totalItems: downloadItem.payload,
        failedItems: [],
        allItemsFailed: false,
      });
    });
    (downloadFolderAsZip as Mock).mockImplementation(downloadFolderSpy);

    await DownloadManagerService.instance.downloadItems(mockTask, mockUpdateProgress, mockIncrementItemCount);

    expect(downloadFolderSpy).toHaveBeenNthCalledWith(1, {
      folder: mockFolder,
      isSharedFolder: mockTask.options.areSharedItems,
      foldersIterator: mockTask.createFoldersIterator,
      filesIterator: mockTask.createFilesIterator,
      updateProgress: expect.anything(),
      updateNumItems: mockIncrementItemCount,
      options: {
        closeWhenFinished: false,
        ...mockTask.credentials,
        destination: expect.anything(),
      },
      abortController: mockTask.abortController,
    });
    expect(downloadFolderSpy).toHaveBeenNthCalledWith(2, {
      folder: mockFolder2,
      isSharedFolder: mockTask.options.areSharedItems,
      foldersIterator: mockTask.createFoldersIterator,
      filesIterator: mockTask.createFilesIterator,
      updateProgress: expect.anything(),
      updateNumItems: mockIncrementItemCount,
      options: {
        closeWhenFinished: false,
        ...mockTask.credentials,
        destination: expect.anything(),
      },
      abortController: mockTask.abortController,
    });
    expect(closeZipSpy).toHaveBeenCalled();
  });

  it('should download file items from task as zip using download service', async () => {
    const mockTaskId = 'mock-task-id';
    const mockFileCache: DriveFileData = { ...mockFile, id: 2, name: 'File2', type: '' };
    const downloadItem: DownloadItem = {
      payload: [mockFile as DriveItemData, mockFileCache as DriveItemData],
      selectedWorkspace: null,
      workspaceCredentials: null,
    };
    const mockTask: DownloadTask = {
      abortController: new AbortController(),
      items: downloadItem.payload,
      createFilesIterator: createFilesIterator,
      createFoldersIterator: createFoldersIterator,
      credentials: {
        credentials: {
          user: 'any-user',
          pass: 'any-pass',
        },
        workspaceId: 'any-workspace-id',
        mnemonic: 'any-mnemonic',
      },
      options: {
        areSharedItems: false,
        downloadName: `${mockFile.name}.${mockFile.type}`,
        showErrors: true,
      },
      taskId: mockTaskId,
      failedItems: [],
    };

    const levelsBlobsCache = new LevelsBlobsCache();
    const lruCache = new LRUCache<DriveItemBlobData>(levelsBlobsCache, 1);
    const lruCacheSpy = vi
      .spyOn(lruCache, 'get')
      .mockResolvedValueOnce({
        id: mockFile.id,
        parentId: mockFile.folderId,
        source: {
          stream: vi.fn().mockReturnValue(new ReadableStream()),
        } as unknown as Blob,
      })
      .mockResolvedValueOnce({
        id: mockFileCache.id,
        parentId: mockFileCache.folderId,
      });
    vi.spyOn(LRUFilesCacheManager, 'getInstance').mockResolvedValue(lruCache);

    const mockUpdateProgress = vi.fn((progress: number) => progress);
    const mockIncrementItemCount = vi.fn(() => 0);

    const checkIfCachedSourceIsOlderSpy = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
    const updateDatabaseFileSourceDataSpy = vi.fn();

    (checkIfCachedSourceIsOlder as Mock).mockImplementation(checkIfCachedSourceIsOlderSpy);
    (binaryStreamToBlob as Mock).mockResolvedValue({
      stream: vi.fn().mockReturnValue(new ReadableStream()),
    });
    (updateDatabaseFileSourceData as Mock).mockImplementation(updateDatabaseFileSourceDataSpy);

    vi.spyOn(FlatFolderZip.prototype, 'abort').mockImplementation(() => {});
    const addFileZipSpy = vi.spyOn(FlatFolderZip.prototype, 'addFile').mockResolvedValue();
    const closeZipSpy = vi.spyOn(FlatFolderZip.prototype, 'close').mockResolvedValue();

    await DownloadManagerService.instance.downloadItems(mockTask, mockUpdateProgress, mockIncrementItemCount);

    expect(addFileZipSpy).toHaveBeenNthCalledWith(1, `${mockFile.name}.${mockFile.type}`, expect.anything());
    expect(addFileZipSpy).toHaveBeenNthCalledWith(2, mockFileCache.name, expect.anything());
    expect(addFileZipSpy).toHaveBeenCalledTimes(2);
    expect(closeZipSpy).toHaveBeenCalledTimes(1);
    expect(checkIfCachedSourceIsOlderSpy).toHaveBeenCalledTimes(2);
    expect(binaryStreamToBlob).toHaveBeenCalledTimes(1);
    expect(updateDatabaseFileSourceDataSpy).toHaveBeenCalledTimes(1);
    expect(lruCacheSpy).toHaveBeenCalledTimes(2);
  });

  it('should handle errors during downloadItems and add to failedItems', async () => {
    const mockTaskId = 'mock-task-id';
    const mockFileCache: DriveFileData = { ...mockFile, id: 2, name: 'File2', type: '' };
    const downloadItem: DownloadItem = {
      payload: [mockFile as DriveItemData, mockFileCache as DriveItemData],
      selectedWorkspace: null,
      workspaceCredentials: null,
    };
    const mockTask: DownloadTask = {
      abortController: new AbortController(),
      items: downloadItem.payload,
      createFilesIterator: createFilesIterator,
      createFoldersIterator: createFoldersIterator,
      credentials: {
        credentials: {
          user: 'any-user',
          pass: 'any-pass',
        },
        workspaceId: 'any-workspace-id',
        mnemonic: 'any-mnemonic',
      },
      options: {
        areSharedItems: false,
        downloadName: `${mockFile.name}.${mockFile.type}`,
        showErrors: true,
      },
      taskId: mockTaskId,
      failedItems: [],
    };

    const mockUpdateProgress = vi.fn();
    const mockIncrementItemCount = vi.fn();

    const levelsBlobsCache = new LevelsBlobsCache();
    const lruCache = new LRUCache<DriveItemBlobData>(levelsBlobsCache, 1);
    const lruCacheSpy = vi
      .spyOn(lruCache, 'get')
      .mockResolvedValueOnce({
        id: mockFile.id,
        parentId: mockFile.folderId,
        source: {
          stream: vi.fn().mockReturnValue(new ReadableStream()),
        } as unknown as Blob,
      })
      .mockRejectedValueOnce(() => {
        throw new Error('File error 2');
      });

    vi.spyOn(LRUFilesCacheManager, 'getInstance').mockResolvedValue(lruCache);
    const checkIfCachedSourceIsOlderSpy = vi.fn().mockReturnValueOnce(true);

    (checkIfCachedSourceIsOlder as Mock).mockImplementation(checkIfCachedSourceIsOlderSpy);
    (updateDatabaseFileSourceData as Mock).mockImplementation(vi.fn());

    vi.spyOn(FlatFolderZip.prototype, 'abort').mockImplementation(() => {});
    const closeZipSpy = vi.spyOn(FlatFolderZip.prototype, 'close').mockResolvedValue();

    await expect(
      DownloadManagerService.instance.downloadItems(mockTask, mockUpdateProgress, mockIncrementItemCount),
    ).resolves.toBeUndefined();

    expect(mockTask.failedItems).toEqual([mockFileCache]);
    expect(lruCacheSpy).toHaveBeenCalledTimes(2);
    expect(checkIfCachedSourceIsOlderSpy).toHaveBeenCalledTimes(1);
    expect(binaryStreamToBlob).toHaveBeenCalledTimes(1);
    expect(updateDatabaseFileSourceData).toHaveBeenCalledTimes(1);
    expect(closeZipSpy).toHaveBeenCalled();
  });

  it('should handle partial failures during downloadItems', async () => {
    const mockTaskId = 'mock-task-id';
    const mockFile2: DriveFileData = { ...mockFile, id: 2, name: 'File2' };
    const downloadItem: DownloadItem = {
      payload: [mockFile as DriveItemData, mockFile2 as DriveItemData],
      selectedWorkspace: null,
      workspaceCredentials: null,
    };
    const mockTask: DownloadTask = {
      abortController: new AbortController(),
      items: downloadItem.payload,
      createFilesIterator: createFilesIterator,
      createFoldersIterator: createFoldersIterator,
      credentials: {
        credentials: {
          user: 'any-user',
          pass: 'any-pass',
        },
        workspaceId: 'any-workspace-id',
        mnemonic: 'any-mnemonic',
      },
      options: {
        areSharedItems: false,
        downloadName: `${mockFile.name}.${mockFile.type}`,
        showErrors: true,
      },
      taskId: mockTaskId,
      failedItems: [],
    };

    const mockUpdateProgress = vi.fn();
    const mockIncrementItemCount = vi.fn();

    const levelsBlobsCache = new LevelsBlobsCache();
    const lruCache = new LRUCache<DriveItemBlobData>(levelsBlobsCache, 1);
    const lruCacheSpy = vi
      .spyOn(lruCache, 'get')
      .mockResolvedValueOnce({
        id: mockFile.id,
        parentId: mockFile.folderId,
        source: {
          stream: vi.fn().mockReturnValue(new ReadableStream()),
        } as unknown as Blob,
      })
      .mockRejectedValueOnce(() => {
        throw new Error('File error 2');
      });
    vi.spyOn(LRUFilesCacheManager, 'getInstance').mockResolvedValue(lruCache);

    const checkIfCachedSourceIsOlderSpy = vi.fn().mockReturnValueOnce(true);

    (checkIfCachedSourceIsOlder as Mock).mockImplementation(checkIfCachedSourceIsOlderSpy);

    vi.spyOn(FlatFolderZip.prototype, 'abort').mockImplementation(() => {});
    const addFileZipSpy = vi.spyOn(FlatFolderZip.prototype, 'addFile').mockResolvedValueOnce();
    const closeZipSpy = vi.spyOn(FlatFolderZip.prototype, 'close').mockResolvedValue();

    await DownloadManagerService.instance.downloadItems(mockTask, mockUpdateProgress, mockIncrementItemCount);

    expect(mockTask.failedItems).toContain(mockFile2);
    expect(addFileZipSpy).toHaveBeenCalledTimes(1);
    expect(closeZipSpy).toHaveBeenCalled();
    expect(lruCacheSpy).toHaveBeenCalledTimes(2);
  });

  describe('downloadItems', () => {
    test('When there is an empty file, then it should be added to the zip without downloading', async () => {
      const emptyFile: DriveFileData = { ...mockFile, id: 3, name: 'EmptyFile', size: 0 };
      const mockTask: DownloadTask = {
        abortController: new AbortController(),
        items: [emptyFile as DriveItemData],
        createFilesIterator: createFilesIterator,
        createFoldersIterator: createFoldersIterator,
        credentials: {
          credentials: {
            user: 'any-user',
            pass: 'any-pass',
          },
          mnemonic: 'any-mnemonic',
        },
        options: {
          areSharedItems: false,
          downloadName: `${emptyFile.name}.${emptyFile.type}`,
          showErrors: true,
        },
        taskId: 'mock-task-id',
        failedItems: [],
      };

      const mockUpdateProgress = vi.fn();
      const mockIncrementItemCount = vi.fn();

      const levelsBlobsCache = new LevelsBlobsCache();
      const lruCache = new LRUCache<DriveItemBlobData>(levelsBlobsCache, 1);
      vi.spyOn(lruCache, 'get').mockResolvedValueOnce({
        id: emptyFile.id,
        parentId: emptyFile.folderId,
        source: undefined,
      });
      vi.spyOn(LRUFilesCacheManager, 'getInstance').mockResolvedValue(lruCache);

      (checkIfCachedSourceIsOlder as Mock).mockReturnValueOnce(true);

      vi.spyOn(FlatFolderZip.prototype, 'abort').mockImplementation(() => {});
      const addFileZipSpy = vi.spyOn(FlatFolderZip.prototype, 'addFile').mockImplementation(() => {});
      const closeZipSpy = vi.spyOn(FlatFolderZip.prototype, 'close').mockResolvedValue();

      await DownloadManagerService.instance.downloadItems(mockTask, mockUpdateProgress, mockIncrementItemCount);

      expect(addFileZipSpy).toHaveBeenCalledWith(`${emptyFile.name}.${emptyFile.type}`, expect.anything());
      expect(closeZipSpy).toHaveBeenCalled();
      expect(downloadFile).not.toHaveBeenCalled();
      expect(binaryStreamToBlob).not.toHaveBeenCalled();
      expect(updateDatabaseFileSourceData).not.toHaveBeenCalled();
    });

    it('should handle partial failures when calling addFolderToZip and add to failedItems', async () => {
      const mockTask: DownloadTask = {
        abortController: new AbortController(),
        items: [mockFile as DriveItemData, mockFolder as DriveItemData],
        createFilesIterator: createFilesIterator,
        createFoldersIterator: createFoldersIterator,
        credentials: {
          credentials: {
            user: 'any-user',
            pass: 'any-pass',
          },
          mnemonic: 'any-mnemonic',
        },
        options: {
          areSharedItems: false,
          downloadName: `${mockFile.name}.${mockFile.type}`,
          showErrors: true,
        },
        taskId: 'mock-task-id',
        failedItems: [],
      };

      const mockUpdateProgress = vi.fn();
      const mockIncrementItemCount = vi.fn();

      const levelsBlobsCache = new LevelsBlobsCache();
      const lruCache = new LRUCache<DriveItemBlobData>(levelsBlobsCache, 1);
      const lruCacheSpy = vi.spyOn(lruCache, 'get').mockResolvedValueOnce({
        id: mockFile.id,
        parentId: mockFile.folderId,
        source: {
          stream: vi.fn().mockReturnValue(new ReadableStream()),
        } as unknown as Blob,
      });
      vi.spyOn(LRUFilesCacheManager, 'getInstance').mockResolvedValue(lruCache);

      const checkIfCachedSourceIsOlderSpy = vi.fn().mockReturnValueOnce(false);

      (checkIfCachedSourceIsOlder as Mock).mockImplementation(checkIfCachedSourceIsOlderSpy);

      vi.spyOn(FlatFolderZip.prototype, 'addFile').mockImplementation(() => {});
      vi.spyOn(FlatFolderZip.prototype, 'abort').mockImplementation(() => {});
      vi.spyOn(FlatFolderZip.prototype, 'close').mockResolvedValue();

      (downloadFolderAsZip as Mock).mockResolvedValueOnce({
        allItemsFailed: false,
        failedItems: [mockFile],
      });

      await DownloadManagerService.instance.downloadItems(mockTask, mockUpdateProgress, mockIncrementItemCount);

      expect(mockTask.failedItems).toContain(mockFile);
      expect(lruCacheSpy).toHaveBeenCalledTimes(1);
      expect(checkIfCachedSourceIsOlderSpy).toHaveBeenCalledTimes(1);
    });

    it('should throw an error when the connection is lost', async () => {
      const mockFile2: DriveFileData = { ...mockFile, id: 2, name: 'File2' };
      const mockTask: DownloadTask = {
        abortController: new AbortController(),
        items: [mockFile as DriveItemData, mockFile2 as DriveItemData],
        createFilesIterator: createFilesIterator,
        createFoldersIterator: createFoldersIterator,
        credentials: {
          credentials: {
            user: 'any-user',
            pass: 'any-pass',
          },
          workspaceId: 'any-workspace-id',
          mnemonic: 'any-mnemonic',
        },
        options: {
          areSharedItems: false,
          downloadName: `${mockFile.name}.${mockFile.type}`,
          showErrors: true,
        },
        taskId: 'mock-task-id',
        failedItems: [],
      };

      const mockUpdateProgress = vi.fn();
      const mockIncrementItemCount = vi.fn();

      const levelsBlobsCache = new LevelsBlobsCache();
      const lruCache = new LRUCache<DriveItemBlobData>(levelsBlobsCache, 1);
      vi.spyOn(lruCache, 'get').mockResolvedValueOnce({
        id: mockFile.id,
        parentId: mockFile.folderId,
        source: undefined,
      });
      vi.spyOn(LRUFilesCacheManager, 'getInstance').mockResolvedValue(lruCache);

      const checkIfCachedSourceIsOlderSpy = vi.fn().mockReturnValueOnce(true);

      (checkIfCachedSourceIsOlder as Mock).mockImplementation(checkIfCachedSourceIsOlderSpy);

      (downloadFile as Mock).mockImplementationOnce(() => {
        throw new ConnectionLostError();
      });

      vi.spyOn(FlatFolderZip.prototype, 'abort').mockImplementation(() => {});

      const closeZipSpy = vi.spyOn(FlatFolderZip.prototype, 'close').mockRejectedValue(new ConnectionLostError());

      await expect(
        DownloadManagerService.instance.downloadItems(mockTask, mockUpdateProgress, mockIncrementItemCount),
      ).rejects.toThrow(ConnectionLostError);

      expect(closeZipSpy).toHaveBeenCalled();
    });

    it('should throw a ServerUnavailable error when all items fail', async () => {
      const mockFile2: DriveFileData = { ...mockFile, id: 2, name: 'File2' };
      const mockTask: DownloadTask = {
        abortController: new AbortController(),
        items: [mockFile as DriveItemData, mockFile2 as DriveItemData],
        createFilesIterator: createFilesIterator,
        createFoldersIterator: createFoldersIterator,
        credentials: {
          credentials: {
            user: 'any-user',
            pass: 'any-pass',
          },
          workspaceId: 'any-workspace-id',
          mnemonic: 'any-mnemonic',
        },
        options: {
          areSharedItems: false,
          downloadName: `${mockFile.name}.${mockFile.type}`,
          showErrors: true,
        },
        taskId: 'mock-task-id',
        failedItems: [],
      };

      const mockUpdateProgress = vi.fn();
      const mockIncrementItemCount = vi.fn();

      const levelsBlobsCache = new LevelsBlobsCache();
      const lruCache = new LRUCache<DriveItemBlobData>(levelsBlobsCache, 1);
      vi.spyOn(lruCache, 'get')
        .mockRejectedValueOnce(() => {
          throw new Error('File error 1');
        })
        .mockRejectedValueOnce(() => {
          throw new Error('File error 2');
        });
      vi.spyOn(LRUFilesCacheManager, 'getInstance').mockResolvedValue(lruCache);

      const checkIfCachedSourceIsOlderSpy = vi.fn().mockReturnValueOnce(true);

      (checkIfCachedSourceIsOlder as Mock).mockImplementation(checkIfCachedSourceIsOlderSpy);

      vi.spyOn(FlatFolderZip.prototype, 'addFile').mockImplementation(() => {
        throw new Error(ErrorMessages.ServerUnavailable);
      });

      vi.spyOn(FlatFolderZip.prototype, 'abort').mockImplementation(() => {});

      const closeZipSpy = vi.spyOn(FlatFolderZip.prototype, 'close').mockResolvedValue();

      await expect(
        DownloadManagerService.instance.downloadItems(mockTask, mockUpdateProgress, mockIncrementItemCount),
      ).rejects.toThrow(ErrorMessages.ServerUnavailable);

      expect(closeZipSpy).toHaveBeenCalled();
    });
  });

  describe('areItemArraysEqual', () => {
    it('should return true for identical arrays', () => {
      const arr1 = [
        { id: 5, isFolder: true },
        { id: 1, isFolder: true },
        { id: 7, isFolder: true },
      ] as DownloadItemType[];
      const arr2 = [
        { id: 1, isFolder: true },
        { id: 7, isFolder: true },
        { id: 5, isFolder: true },
      ] as DownloadItemType[];

      const result = areItemArraysEqual(arr1, arr2);
      expect(result).toBe(true);
    });

    it('should return false for arrays with different lengths', () => {
      const arr1 = [{ id: 1, isFolder: true }] as DownloadItemType[];
      const arr2 = [
        { id: 1, isFolder: true },
        { id: 2, isFolder: false },
      ] as DownloadItemType[];

      const result = areItemArraysEqual(arr1, arr2);
      expect(result).toBe(false);
    });

    it('should return false for arrays with different items', () => {
      const arr1 = [
        { id: 1, isFolder: true },
        { id: 3, isFolder: true },
      ] as DownloadItemType[];
      const arr2 = [
        { id: 2, isFolder: true },
        { id: 1, isFolder: true },
      ] as DownloadItemType[];

      const result = areItemArraysEqual(arr1, arr2);
      expect(result).toBe(false);
    });
  });

  describe('downloadManagerService - Error Handling', () => {
    it('should handle errors in downloadFolder and rethrow them', async () => {
      const mockTask: DownloadTask = {
        abortController: new AbortController(),
        items: [mockFolder as DriveItemData],
        createFilesIterator: createFilesIterator,
        createFoldersIterator: createFoldersIterator,
        credentials: {
          credentials: {
            user: 'any-user',
            pass: 'any-pass',
          },
          mnemonic: 'any-mnemonic',
        },
        options: {
          areSharedItems: false,
          downloadName: mockFolder.name,
          showErrors: true,
        },
        taskId: 'mock-task-id',
        failedItems: [],
      };

      const mockUpdateProgress = vi.fn();
      const mockIncrementItemCount = vi.fn();

      (downloadFolderAsZip as Mock).mockRejectedValueOnce(new Error('Folder download error'));

      await expect(
        DownloadManagerService.instance.downloadFolder(mockTask, mockUpdateProgress, mockIncrementItemCount),
      ).rejects.toThrow('Folder download error');
    });

    // it('should handle errors in downloadFile and rethrow them', async () => {
    //   const mockTask: DownloadTask = {
    //     abortController: new AbortController(),
    //     items: [mockFile as DriveItemData],
    //     createFilesIterator: createFilesIterator,
    //     createFoldersIterator: createFoldersIterator,
    //     credentials: {
    //       credentials: {
    //         user: 'any-user',
    //         pass: 'any-pass',
    //       },
    //       mnemonic: 'any-mnemonic',
    //     },
    //     options: {
    //       areSharedItems: false,
    //       downloadName: `${mockFile.name}.${mockFile.type}`,
    //       showErrors: true,
    //     },
    //     taskId: 'mock-task-id',
    //     failedItems: [],
    //   };

    //   const mockUpdateProgress = vi.fn();

    //   vi.spyOn(downloadService, 'downloadFile').mockRejectedValueOnce(new Error('File download error'));

    //   await expect(DownloadManagerService.instance.downloadFile(mockTask, mockUpdateProgress)).rejects.toThrow(
    //     'File download error',
    //   );
    // });

    it('should handle connection loss in downloadItems and throw ConnectionLostError', async () => {
      const mockFile2: DriveFileData = { ...mockFile, id: 2, name: 'File2' };
      const mockTask: DownloadTask = {
        abortController: new AbortController(),
        items: [mockFile as DriveItemData, mockFile2 as DriveItemData],
        createFilesIterator: createFilesIterator,
        createFoldersIterator: createFoldersIterator,
        credentials: {
          credentials: {
            user: 'any-user',
            pass: 'any-pass',
          },
          mnemonic: 'any-mnemonic',
        },
        options: {
          areSharedItems: false,
          downloadName: `${mockFile.name}.${mockFile.type}`,
          showErrors: true,
        },
        taskId: 'mock-task-id',
        failedItems: [],
      };

      const mockUpdateProgress = vi.fn();
      const mockIncrementItemCount = vi.fn();

      const levelsBlobsCache = new LevelsBlobsCache();
      const lruCache = new LRUCache<DriveItemBlobData>(levelsBlobsCache, 1);
      const lruCacheSpy = vi
        .spyOn(lruCache, 'get')
        .mockResolvedValueOnce({
          id: mockFile.id,
          parentId: mockFile.folderId,
          source: {
            stream: vi.fn().mockReturnValue(new ReadableStream()),
          } as unknown as Blob,
        })
        .mockResolvedValueOnce({
          id: mockFile2.id,
          parentId: mockFile2.folderId,
          source: undefined,
        });
      vi.spyOn(LRUFilesCacheManager, 'getInstance').mockResolvedValue(lruCache);

      const checkIfCachedSourceIsOlderSpy = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);

      (checkIfCachedSourceIsOlder as Mock).mockImplementation(checkIfCachedSourceIsOlderSpy);

      const spyAddFile = vi.spyOn(FlatFolderZip.prototype, 'addFile').mockImplementation(() => {});
      const spyAbortFile = vi.spyOn(FlatFolderZip.prototype, 'abort').mockImplementation(() => {});
      const spyCloseFile = vi.spyOn(FlatFolderZip.prototype, 'close').mockRejectedValue(new ConnectionLostError());

      (downloadFile as Mock).mockImplementationOnce(() => {
        throw new ConnectionLostError();
      });

      await expect(
        DownloadManagerService.instance.downloadItems(mockTask, mockUpdateProgress, mockIncrementItemCount),
      ).rejects.toThrow(ConnectionLostError);
      expect(lruCacheSpy).toHaveBeenCalledTimes(2);
      expect(spyAddFile).toHaveBeenCalledTimes(1);
      expect(spyAbortFile).toHaveBeenCalledTimes(1);
      expect(spyCloseFile).toHaveBeenCalledTimes(1);
      expect(mockTask.failedItems).toEqual([]);
    });

    it('should handle all items failing in downloadItems and throw ServerUnavailable error', async () => {
      const mockTask: DownloadTask = {
        abortController: new AbortController(),
        items: [mockFolder as DriveItemData],
        createFilesIterator: createFilesIterator,
        createFoldersIterator: createFoldersIterator,
        credentials: {
          credentials: {
            user: 'any-user',
            pass: 'any-pass',
          },
          mnemonic: 'any-mnemonic',
        },
        options: {
          areSharedItems: false,
          downloadName: `${mockFile.name}.${mockFile.type}`,
          showErrors: true,
        },
        taskId: 'mock-task-id',
        failedItems: [],
      };

      const mockUpdateProgress = vi.fn();
      const mockIncrementItemCount = vi.fn();

      vi.spyOn(FlatFolderZip.prototype, 'abort').mockImplementation(() => {});
      vi.spyOn(FlatFolderZip.prototype, 'close').mockResolvedValue();

      (downloadFolderAsZip as Mock).mockResolvedValueOnce({
        allItemsFailed: true,
        failedItems: [],
      });

      await expect(
        DownloadManagerService.instance.downloadItems(mockTask, mockUpdateProgress, mockIncrementItemCount),
      ).rejects.toThrow(ErrorMessages.ServerUnavailable);
    });

    it('should handle partial failures in downloadItems and add to failedItems', async () => {
      const mockTask: DownloadTask = {
        abortController: new AbortController(),
        items: [mockFile as DriveItemData, mockFolder as DriveItemData],
        createFilesIterator: createFilesIterator,
        createFoldersIterator: createFoldersIterator,
        credentials: {
          credentials: {
            user: 'any-user',
            pass: 'any-pass',
          },
          mnemonic: 'any-mnemonic',
        },
        options: {
          areSharedItems: false,
          downloadName: `${mockFile.name}.${mockFile.type}`,
          showErrors: true,
        },
        taskId: 'mock-task-id',
        failedItems: [],
      };

      const mockUpdateProgress = vi.fn();
      const mockIncrementItemCount = vi.fn();

      const levelsBlobsCache = new LevelsBlobsCache();
      const lruCache = new LRUCache<DriveItemBlobData>(levelsBlobsCache, 1);
      const lruCacheSpy = vi.spyOn(lruCache, 'get').mockResolvedValueOnce({
        id: mockFile.id,
        parentId: mockFile.folderId,
        source: {
          stream: vi.fn().mockReturnValue(new ReadableStream()),
        } as unknown as Blob,
      });
      vi.spyOn(LRUFilesCacheManager, 'getInstance').mockResolvedValue(lruCache);

      const checkIfCachedSourceIsOlderSpy = vi.fn().mockReturnValueOnce(false);

      (checkIfCachedSourceIsOlder as Mock).mockImplementation(checkIfCachedSourceIsOlderSpy);

      vi.spyOn(FlatFolderZip.prototype, 'addFile').mockImplementation(() => {});
      vi.spyOn(FlatFolderZip.prototype, 'abort').mockImplementation(() => {});
      vi.spyOn(FlatFolderZip.prototype, 'close').mockResolvedValue();

      (downloadFolderAsZip as Mock).mockResolvedValueOnce({
        allItemsFailed: true,
      });

      await DownloadManagerService.instance.downloadItems(mockTask, mockUpdateProgress, mockIncrementItemCount);

      expect(mockTask.failedItems).toContain(mockFolder);
      expect(lruCacheSpy).toHaveBeenCalledTimes(1);
      expect(checkIfCachedSourceIsOlderSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('downloadManagerService - Connection Handling', () => {
    let navigatorOnLineSpy: MockInstance;
    let addEventListenerSpy: MockInstance;
    let removeEventListenerSpy: MockInstance;
    let setTimeoutSpy: MockInstance;
    let clearTimeoutSpy: MockInstance;

    beforeAll(() => {
      vi.useFakeTimers();
      navigatorOnLineSpy = vi.spyOn(navigator, 'onLine', 'get');
      addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
      clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    });

    afterAll(() => {
      vi.useRealTimers();
      navigatorOnLineSpy.mockRestore();
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
      setTimeoutSpy.mockRestore();
      clearTimeoutSpy.mockRestore();
    });

    describe('checkAndHandleConnectionLost', () => {
      it('should throw ConnectionLostError if connection is lost', async () => {
        navigatorOnLineSpy.mockReturnValue(false);
        await expect(DownloadManagerService.instance.checkAndHandleConnectionLost(true)).rejects.toThrow(
          ConnectionLostError,
        );
      });

      it('should throw ConnectionLostError if connectionLost is true and there is a zip value', async () => {
        const connectionLost = true;
        const zip = new FlatFolderZip('any-path', {});
        const spyAbort = vi.spyOn(FlatFolderZip.prototype, 'abort');
        const spyClose = vi.spyOn(FlatFolderZip.prototype, 'close').mockResolvedValueOnce();
        await expect(DownloadManagerService.instance.checkAndHandleConnectionLost(connectionLost, zip)).rejects.toThrow(
          ConnectionLostError,
        );
        expect(spyAbort).toHaveBeenCalledTimes(1);
        expect(spyClose).toHaveBeenCalledTimes(1);
      });

      it('should not throw if connection is fine', async () => {
        navigatorOnLineSpy.mockReturnValue(true);
        await expect(DownloadManagerService.instance.checkAndHandleConnectionLost(false)).resolves.toBeUndefined();
      });
    });

    describe('handleConnectionLost', () => {
      it('should initialize with connectionLost as false when online', () => {
        navigatorOnLineSpy.mockReturnValue(true);
        const { connectionLost } = DownloadManagerService.instance.handleConnectionLost(1000);
        expect(connectionLost).toBe(false);
      });

      it('should initialize with connectionLost as true when offline', () => {
        navigatorOnLineSpy.mockReturnValue(false);
        const { connectionLost } = DownloadManagerService.instance.handleConnectionLost(1000);
        expect(connectionLost).toBe(true);
      });

      it('should call checkConnection after timeout', async () => {
        navigatorOnLineSpy.mockReturnValue(false);
        const warnSpy = vi.spyOn(console, 'warn');

        const { cleanup } = DownloadManagerService.instance.handleConnectionLost(1000);
        vi.advanceTimersByTime(1000);

        expect(warnSpy).toHaveBeenCalledWith('Connection lost detected.');
        cleanup();
      });

      it('should add an offline event listener', () => {
        DownloadManagerService.instance.handleConnectionLost(1000);
        expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
      });

      it('should set a timeout to check connection', () => {
        DownloadManagerService.instance.handleConnectionLost(1000);
        expect(setTimeoutSpy).toHaveBeenCalled();
      });

      it('should update connectionLost when offline event is triggered', () => {
        const { cleanup } = DownloadManagerService.instance.handleConnectionLost(1000);
        const offlineListener = addEventListenerSpy.mock.calls[0][1];
        const warnSpy = vi.spyOn(console, 'warn');

        offlineListener();
        expect(warnSpy).toHaveBeenCalledWith('Offline event detected');
        cleanup();
      });

      it('should clear the timeout and remove the event listener on cleanup', () => {
        const { cleanup } = DownloadManagerService.instance.handleConnectionLost(1000);
        cleanup();
        expect(clearTimeoutSpy).toHaveBeenCalled();
        expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
      });
    });
  });

  describe('Download a file from worker', () => {
    beforeEach(() => {
      vi.clearAllMocks();

      vi.spyOn(downloadWorkerHandler, 'getWorker').mockReturnValue(mockWorker);
      vi.spyOn(downloadWorkerHandler, 'handleWorkerMessages').mockResolvedValue(() => {});

      vi.stubGlobal('navigator', {
        ...navigator,
        brave: { isBrave: vi.fn().mockResolvedValue(false) },
        userAgent: 'Mozilla/5.0 (Chrome)',
      });
      vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    test('When the download is started, then the worker is started and the handler should be called correctly', async () => {
      const updateProgressCallback = vi.fn();
      const payload = {
        file: mockFile,
        isWorkspace: false,
        updateProgressCallback,
        sharingOptions: mockSharingOptions,
      };

      await DownloadManagerService.instance.downloadFileFromWorker(payload);

      expect(downloadWorkerHandler.getWorker).toHaveBeenCalled();
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'download',
        params: {
          file: mockFile,
          isWorkspace: false,
          credentials: mockSharingOptions,
          shouldDownloadUsingBlob: false,
        },
      });
      expect(downloadWorkerHandler.handleWorkerMessages).toHaveBeenCalledWith({
        worker: mockWorker,
        itemData: mockFile,
        updateProgressCallback,
        abortController: undefined,
      });
    });

    test('When the browser is brave, then the worker is started with a flag indicating so', async () => {
      const updateProgressCallback = vi.fn();
      (navigator as any).brave = { isBrave: vi.fn().mockResolvedValue(true) };

      const payload = {
        file: mockFile,
        isWorkspace: true,
        updateProgressCallback,
        sharingOptions: mockSharingOptions,
      };

      await DownloadManagerService.instance.downloadFileFromWorker(payload);

      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'download',
        params: {
          file: mockFile,
          isWorkspace: true,
          credentials: mockSharingOptions,
          shouldDownloadUsingBlob: true,
        },
      });
    });

    test('When an error occurs in the worker, then it should be thrown', async () => {
      const workerError = new Error('Worker failed');
      const updateProgressCallback = vi.fn();
      vi.spyOn(downloadWorkerHandler, 'handleWorkerMessages').mockRejectedValue(workerError);

      const payload = {
        file: mockFile,
        isWorkspace: false,
        updateProgressCallback,
        sharingOptions: mockSharingOptions,
      };

      await expect(DownloadManagerService.instance.downloadFileFromWorker(payload)).rejects.toThrow(workerError);
    });

    test('When no abort controller is passed, then the worker is started without it', async () => {
      const updateProgressCallback = vi.fn();

      const payload = {
        file: mockFile,
        isWorkspace: false,
        updateProgressCallback,
        sharingOptions: mockSharingOptions,
      };

      await expect(DownloadManagerService.instance.downloadFileFromWorker(payload)).resolves.toEqual(
        expect.any(Function),
      );

      expect(downloadWorkerHandler.handleWorkerMessages).toHaveBeenCalledWith({
        worker: mockWorker,
        itemData: mockFile,
        updateProgressCallback,
        abortController: undefined,
      });
    });
  });
});
