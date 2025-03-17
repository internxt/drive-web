import {
  DownloadCredentials,
  DownloadItem,
  DownloadManagerService,
  DownloadTask,
} from 'app/drive/services/downloadManager.service';
import { beforeAll, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { Workspace, WorkspaceCredentialsDetails, WorkspaceData, WorkspaceUser } from '@internxt/sdk/dist/workspaces';
import { DriveFileData, DriveFolderData, DriveItemData } from '../types';
import { checkIfCachedSourceIsOlder, createFilesIterator, createFoldersIterator } from './folder.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import localStorageService from 'app/core/services/local-storage.service';
import tasksService from 'app/tasks/services/tasks.service';
import { EncryptionVersion, FileStatus } from '@internxt/sdk/dist/drive/storage/types';
import { TaskStatus, TaskType } from 'app/tasks/types';
import { saveAs } from 'file-saver';
import downloadService from './download.service';
import { getDatabaseFileSourceData } from './database.service';

describe('downloadManagerService', () => {
  beforeAll(() => {
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

    vi.mock('app/drive/services/folder.service', () => ({
      default: {},
      createFilesIterator: vi.fn(),
      createFoldersIterator: vi.fn(),
      checkIfCachedSourceIsOlder: vi.fn(),
    }));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

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
      payload: [mockFile as DriveItemData],
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
        downloadName: `${mockFile.name}.${mockFile.type}`,
        showErrors: true,
      },
      taskId: mockTaskId,
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
    };
    const mockUpdateProgress = vi.fn((progress: number) => progress);
    const mockIncrementItemCount = vi.fn(() => 0);

    const updateTaskSpy = vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    const downloadFolderItemSpy = vi.spyOn(DownloadManagerService.instance, 'downloadFolderItem').mockResolvedValue();

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
      isSharedFolder: mockTask.options.areSharedItems,
      driveItem: mockFolder,
      closeWhenFinished: true,
      credentials: mockTask.credentials,
      updateProgress: mockUpdateProgress,
      incrementItemCount: mockIncrementItemCount,
      createFoldersIterator: mockTask.createFoldersIterator,
      createFilesIterator: mockTask.createFilesIterator,
      abortController: mockTask.abortController,
    });
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

  it('should downloadFile from task using download service', async () => {
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
    };
    const mockUpdateProgress = vi.fn((progress: number) => progress);

    const getDatabaseFileSourceDataSpy = vi.fn(() => {
      return { source: null };
    });
    const checkIfCachedSourceIsOlderSpy = vi.fn(() => true);

    (getDatabaseFileSourceData as Mock).mockImplementation(getDatabaseFileSourceDataSpy);
    (checkIfCachedSourceIsOlder as Mock).mockImplementation(checkIfCachedSourceIsOlderSpy);

    const downloadFileSpy = vi.spyOn(downloadService, 'downloadFile').mockResolvedValue();

    await DownloadManagerService.instance.downloadFile(mockTask, mockUpdateProgress);

    expect(getDatabaseFileSourceDataSpy).toHaveBeenCalledWith({
      fileId: mockFile.id,
    });
    expect(checkIfCachedSourceIsOlderSpy).toHaveBeenCalledOnce();
    expect(downloadFileSpy).toHaveBeenCalledWith(
      mockFile,
      !!mockTask.credentials.workspaceId,
      mockUpdateProgress,
      mockTask.abortController,
      mockTask.credentials,
    );
  });
});
