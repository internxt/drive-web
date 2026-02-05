import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { uploadFileWithManager } from './UploadManager';
import tasksService from 'app/tasks/services/tasks.service';
import errorService from 'services/error.service';
import AppError from 'app/core/types';
import uploadFile from 'app/drive/services/file.service/uploadFile';
import DatabaseUploadRepository from 'app/repositories/DatabaseUploadRepository';
import { DriveFileData } from 'app/drive/types';
import RetryManager from './RetryManager';
import { TaskStatus } from 'app/tasks/types';
import { ErrorMessages } from 'app/core/constants';

vi.mock('app/drive/services/file.service/uploadFile', () => ({
  default: vi.fn(() => Promise.resolve({} as DriveFileData)),
}));

vi.mock('app/tasks/services/tasks.service', () => ({
  default: {
    create: vi.fn(),
    updateTask: vi.fn(),
    findTask: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
}));

vi.mock('services/error.service', () => ({
  default: {
    castError: vi.fn().mockImplementation((e) => e),
    reportError: vi.fn(),
  },
}));

vi.mock('app/repositories/DatabaseUploadRepository', () => {
  const uploadState: Record<string, TaskStatus> = {};

  return {
    default: {
      getInstance: vi.fn(() => ({
        setUploadState: vi.fn(async (id: string, status: TaskStatus) => {
          uploadState[id] = status;
        }),
        getUploadState: vi.fn(async (id: string) => uploadState[id]),
        removeUploadState: vi.fn(async (id: string) => {
          delete uploadState[id];
        }),
      })),
    },
  };
});

vi.mock('i18next', () => ({ t: () => 'Translation message' }));

const openMaxSpaceOccupiedDialogMock = vi.fn();

const mockFile1 = {
  id: 1,
  uuid: 'file-uuid1',
  name: 'File1',
  bucket: 'bucket',
  folderId: 0,
  userId: 0,
  isFile: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as unknown as DriveFileData;
const mockFile2 = {
  id: 2,
  uuid: 'file-uuid2',
  name: 'File2',
  bucket: 'bucket',
  folderId: 1,
  userId: 0,
  isFile: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as unknown as DriveFileData;
const taskId = 'task-id';

describe('UploadManager memory usage conditions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle case when window.performance.memory is undefined', async () => {
    const originalPerformance = window.performance;
    Object.defineProperty(window, 'performance', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const uploadFileSpy = (uploadFile as Mock).mockResolvedValueOnce(mockFile1);
    vi.spyOn(tasksService, 'create').mockReturnValue('taskId');
    vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(tasksService, 'addListener').mockReturnValue();
    vi.spyOn(tasksService, 'removeListener').mockReturnValue();
    vi.spyOn(errorService, 'castError').mockResolvedValue(new AppError('error'));

    await uploadFileWithManager(
      [
        {
          taskId: 'taskId',
          filecontent: {
            content: 'file-content' as unknown as File,
            type: 'text/plain',
            name: 'file.txt',
            size: 1024,
            parentFolderId: 'folder-1',
          },
          userEmail: '',
          parentFolderId: '',
        },
      ],
      openMaxSpaceOccupiedDialogMock,
      DatabaseUploadRepository.getInstance(),
      undefined,
      {
        ownerUserAuthenticationData: undefined,
        sharedItemData: {
          isDeepFolder: false,
          currentFolderId: 'parentFolderId',
        },
        isUploadedFromFolder: true,
      },
    );

    expect(uploadFileSpy).toHaveBeenCalledOnce();

    Object.defineProperty(window, 'performance', {
      value: originalPerformance,
      writable: true,
      configurable: true,
    });
  });

  it('should handle case when memory properties are null', async () => {
    const originalPerformance = window.performance;
    Object.defineProperty(window, 'performance', {
      value: {
        memory: {
          jsHeapSizeLimit: null,
          usedJSHeapSize: null,
        },
      },
      writable: true,
      configurable: true,
    });

    const uploadFileSpy = (uploadFile as Mock).mockResolvedValueOnce(mockFile1);
    vi.spyOn(tasksService, 'create').mockReturnValue('taskId');
    vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(tasksService, 'addListener').mockReturnValue();
    vi.spyOn(tasksService, 'removeListener').mockReturnValue();
    vi.spyOn(errorService, 'castError').mockResolvedValue(new AppError('error'));

    await uploadFileWithManager(
      [
        {
          taskId: 'taskId',
          filecontent: {
            content: 'file-content' as unknown as File,
            type: 'text/plain',
            name: 'file.txt',
            size: 1024,
            parentFolderId: 'folder-1',
          },
          userEmail: '',
          parentFolderId: '',
        },
      ],
      openMaxSpaceOccupiedDialogMock,
      DatabaseUploadRepository.getInstance(),
      undefined,
      {
        ownerUserAuthenticationData: undefined,
        sharedItemData: {
          isDeepFolder: false,
          currentFolderId: 'parentFolderId',
        },
        isUploadedFromFolder: true,
      },
    );

    expect(uploadFileSpy).toHaveBeenCalledOnce();

    Object.defineProperty(window, 'performance', {
      value: originalPerformance,
      writable: true,
      configurable: true,
    });
  });
});

describe('checkUploadFiles', () => {
  beforeEach(() => {
    RetryManager.clearTasks();
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should upload file using an async queue', async () => {
    const uploadFileSpy = (uploadFile as Mock).mockResolvedValueOnce(mockFile1);
    vi.spyOn(tasksService, 'create').mockReturnValue('taskId');
    vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(tasksService, 'addListener').mockReturnValue();
    vi.spyOn(tasksService, 'removeListener').mockReturnValue();
    vi.spyOn(errorService, 'castError').mockResolvedValue(new AppError('error'));

    await uploadFileWithManager(
      [
        {
          taskId: 'taskId',
          filecontent: {
            content: 'file-content' as unknown as File,
            type: 'text/plain',
            name: 'file.txt',
            size: 1024,
            parentFolderId: 'folder-1',
          },
          userEmail: '',
          parentFolderId: '',
        },
      ],
      openMaxSpaceOccupiedDialogMock,
      DatabaseUploadRepository.getInstance(),
      undefined,
      {
        ownerUserAuthenticationData: undefined,
        sharedItemData: {
          isDeepFolder: false,
          currentFolderId: 'parentFolderId',
        },
        isUploadedFromFolder: true,
      },
    );

    expect(uploadFileSpy).toHaveBeenCalledOnce();
  });

  it('should upload multiple files using an async queue', async () => {
    const uploadFileSpy = (uploadFile as Mock).mockResolvedValueOnce(mockFile1).mockResolvedValueOnce(mockFile2);

    vi.spyOn(tasksService, 'create').mockReturnValue(taskId);
    vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(errorService, 'castError').mockResolvedValue(new AppError('error'));

    await uploadFileWithManager(
      [
        {
          taskId: 'taskId1',
          filecontent: {
            content: 'file-content1' as unknown as File,
            type: 'text/plain1',
            name: 'file1.txt',
            size: 1024,
            parentFolderId: 'folder-1',
          },
          userEmail: '',
          parentFolderId: '',
        },
        {
          taskId: 'taskId2',
          filecontent: {
            content: 'file-content2' as unknown as File,
            type: 'text/plain2',
            name: 'file2.txt',
            size: 1024,
            parentFolderId: 'folder-1',
          },
          userEmail: '',
          parentFolderId: '',
        },
      ],
      openMaxSpaceOccupiedDialogMock,
      DatabaseUploadRepository.getInstance(),
      undefined,
      {
        ownerUserAuthenticationData: undefined,
        sharedItemData: {
          isDeepFolder: false,
          currentFolderId: 'parentFolderId',
        },
        isUploadedFromFolder: true,
      },
    );

    expect(uploadFileSpy).toHaveBeenCalledTimes(2);
  });

  it('should abort the file upload if abortController is called', async () => {
    const abortController = new AbortController();

    uploadFileWithManager(
      [
        {
          taskId: 'taskId',
          filecontent: {
            content: 'file-content' as unknown as File,
            type: 'text/plain',
            name: 'file.txt',
            size: 1024,
            parentFolderId: 'folder-1',
          },
          userEmail: '',
          parentFolderId: '',
        },
      ],
      openMaxSpaceOccupiedDialogMock,
      DatabaseUploadRepository.getInstance(),
      abortController,
      {
        ownerUserAuthenticationData: undefined,
        sharedItemData: {
          isDeepFolder: false,
          currentFolderId: 'parentFolderId',
        },
        isUploadedFromFolder: true,
      },
    );

    abortController.abort();
    expect(abortController.signal.aborted).toBe(true);
  });

  it('should not add files to RetryManager if upload is successful and remove from RetryManager', async () => {
    (uploadFile as Mock).mockResolvedValueOnce(mockFile1);
    vi.spyOn(Promise, 'all').mockResolvedValueOnce([mockFile1]);
    const RetryAddFilesSpy = vi.spyOn(RetryManager, 'addTasks');
    const RetrRemoveFileSpy = vi.spyOn(RetryManager, 'removeTask');

    vi.spyOn(tasksService, 'create').mockReturnValue('taskId');
    vi.spyOn(tasksService, 'updateTask').mockReturnValueOnce();
    vi.spyOn(tasksService, 'addListener').mockReturnValue();
    vi.spyOn(tasksService, 'removeListener').mockReturnValue();
    vi.spyOn(errorService, 'castError').mockResolvedValue(new AppError('error'));

    await uploadFileWithManager(
      [
        {
          taskId: 'taskId',
          filecontent: {
            content: 'file-content' as unknown as File,
            type: 'text/plain',
            name: 'file.txt',
            size: 1024,
            parentFolderId: 'folder-1',
          },
          userEmail: '',
          parentFolderId: '',
        },
      ],
      openMaxSpaceOccupiedDialogMock,
      DatabaseUploadRepository.getInstance(),
      undefined,
      {
        ownerUserAuthenticationData: undefined,
        sharedItemData: {
          isDeepFolder: false,
          currentFolderId: 'parentFolderId',
        },
        isUploadedFromFolder: true,
      },
    );

    expect(RetryAddFilesSpy).not.toHaveBeenCalled();
    expect(RetrRemoveFileSpy).toHaveBeenCalledWith('taskId');
  });

  it('should add files to RetryManager if any upload fails', async () => {
    //needs to fail twice because MAX_UPLOAD_ATTEMPTS = 2
    (uploadFile as Mock)
      .mockResolvedValueOnce(mockFile1)
      .mockRejectedValueOnce(new AppError('Retryable file'))
      .mockRejectedValueOnce(new AppError('Retryable file'));
    vi.spyOn(Promise, 'all').mockResolvedValueOnce([mockFile1, undefined]);
    const RetryAddFilesSpy = vi.spyOn(RetryManager, 'addTasks');

    vi.spyOn(tasksService, 'create').mockReturnValue('taskId');
    vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(tasksService, 'addListener').mockReturnValue();
    vi.spyOn(tasksService, 'removeListener').mockReturnValue();
    vi.spyOn(errorService, 'castError').mockResolvedValue(new AppError('error'));

    await uploadFileWithManager(
      [
        {
          taskId: 'taskId',
          filecontent: {
            content: 'file-content' as unknown as File,
            type: 'text/plain',
            name: 'file.txt',
            size: 1024,
            parentFolderId: 'folder-1',
          },
          userEmail: '',
          parentFolderId: '',
        },
        {
          taskId: 'taskId2',
          filecontent: {
            content: 'file-content2' as unknown as File,
            type: 'text/plain2',
            name: 'file2.txt',
            size: 1024,
            parentFolderId: 'folder-1',
          },
          userEmail: '',
          parentFolderId: '',
        },
      ],
      openMaxSpaceOccupiedDialogMock,
      DatabaseUploadRepository.getInstance(),
      undefined,
      {
        ownerUserAuthenticationData: undefined,
        sharedItemData: {
          isDeepFolder: false,
          currentFolderId: 'parentFolderId',
        },
        isUploadedFromFolder: true,
      },
    );

    expect(RetryAddFilesSpy).toHaveBeenCalled();
    expect(RetryManager.getTasks().length).toBe(1);
  });

  it('should change status to failed if cannot retry successfully', async () => {
    //needs to fail twice because MAX_UPLOAD_ATTEMPTS = 2
    (uploadFile as Mock)
      .mockRejectedValueOnce(new AppError('Retryable file'))
      .mockRejectedValueOnce(new AppError('Retryable file'));
    vi.spyOn(Promise, 'all').mockResolvedValueOnce([undefined]);
    const RetryChangeStatusSpy = vi.spyOn(RetryManager, 'changeStatus');

    vi.spyOn(tasksService, 'create').mockReturnValue('taskId');
    vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(tasksService, 'addListener').mockReturnValue();
    vi.spyOn(tasksService, 'removeListener').mockReturnValue();
    vi.spyOn(errorService, 'castError').mockResolvedValue(new AppError('error'));

    await uploadFileWithManager(
      [
        {
          taskId: 'taskId',
          filecontent: {
            content: 'file-content' as unknown as File,
            type: 'text/plain',
            name: 'file.txt',
            size: 1024,
            parentFolderId: 'folder-1',
          },
          userEmail: '',
          parentFolderId: '',
        },
      ],
      openMaxSpaceOccupiedDialogMock,
      DatabaseUploadRepository.getInstance(),
      undefined,
      {
        ownerUserAuthenticationData: undefined,
        sharedItemData: {
          isDeepFolder: false,
          currentFolderId: 'parentFolderId',
        },
        isUploadedFromFolder: true,
      },
    );

    expect(RetryChangeStatusSpy).toHaveBeenCalledWith('taskId', 'failed');
  });

  it('should handle lost connection error during upload', async () => {
    const lostConnectionError = new AppError(ErrorMessages.NetworkError);
    (uploadFile as Mock).mockRejectedValueOnce(lostConnectionError);

    const updateTaskSpy = vi.spyOn(tasksService, 'updateTask');
    vi.spyOn(errorService, 'reportError').mockReturnValue();

    await expect(
      uploadFileWithManager(
        [
          {
            taskId: 'taskId',
            filecontent: {
              content: 'file-content' as unknown as File,
              type: 'text/plain',
              name: 'file.txt',
              size: 1024,
              parentFolderId: 'folder-1',
            },
            userEmail: '',
            parentFolderId: '',
          },
        ],
        openMaxSpaceOccupiedDialogMock,
        DatabaseUploadRepository.getInstance(),
        undefined,
        {
          ownerUserAuthenticationData: undefined,
          sharedItemData: {
            isDeepFolder: false,
            currentFolderId: 'parentFolderId',
          },
          isUploadedFromFolder: true,
        },
      ),
    ).rejects.toThrow(lostConnectionError);

    expect(errorService.reportError).toHaveBeenCalledWith(lostConnectionError);
    expect(updateTaskSpy).toHaveBeenCalledWith({
      taskId: 'taskId',
      merge: { status: TaskStatus.Error, subtitle: expect.any(String) },
    });
  });

  it('should handle an unexpected error', async () => {
    const unexpectedError = new AppError(ErrorMessages.ServerUnavailable);
    (uploadFile as Mock).mockRejectedValue(unexpectedError);

    const updateTaskSpy = vi.spyOn(tasksService, 'updateTask');
    const errorServiceSpy = vi.spyOn(errorService, 'reportError').mockReturnValue();

    await expect(
      uploadFileWithManager(
        [
          {
            taskId: 'taskId',
            filecontent: {
              content: 'file-content' as unknown as File,
              type: 'text/plain',
              name: 'file.txt',
              size: 1024,
              parentFolderId: 'folder-1',
            },
            userEmail: '',
            parentFolderId: '',
          },
        ],
        openMaxSpaceOccupiedDialogMock,
        DatabaseUploadRepository.getInstance(),
        undefined,
        {
          ownerUserAuthenticationData: undefined,
          sharedItemData: {
            isDeepFolder: false,
            currentFolderId: 'parentFolderId',
          },
          isUploadedFromFolder: true,
        },
      ),
    ).rejects.toThrow(unexpectedError);

    expect(errorServiceSpy).toHaveBeenCalledWith(unexpectedError);
    expect(updateTaskSpy).toHaveBeenCalledWith({
      taskId: 'taskId',
      merge: { status: TaskStatus.Error, subtitle: expect.any(String) },
    });
  });

  it('When uploading a file to a workspace, then it uses workspace credentials and same bucket for file and thumbnail', async () => {
    const workspaceBucket = 'workspace-bucket-123';
    const workspaceId = 'workspace-id-456';
    const uploadFileSpy = (uploadFile as Mock).mockResolvedValueOnce(mockFile1);

    vi.spyOn(tasksService, 'create').mockReturnValue('taskId');
    vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(tasksService, 'addListener').mockReturnValue();
    vi.spyOn(tasksService, 'removeListener').mockReturnValue();
    vi.spyOn(errorService, 'castError').mockResolvedValue(new AppError('error'));

    await uploadFileWithManager(
      [
        {
          taskId: 'taskId',
          filecontent: {
            content: 'file-content' as unknown as File,
            type: 'text/plain',
            name: 'file.txt',
            size: 1024,
            parentFolderId: 'folder-1',
          },
          userEmail: 'user@test.com',
          parentFolderId: '',
        },
      ],
      openMaxSpaceOccupiedDialogMock,
      DatabaseUploadRepository.getInstance(),
      undefined,
      {
        ownerUserAuthenticationData: {
          bucketId: workspaceBucket,
          workspaceId: workspaceId,
          bridgeUser: 'bridge-user',
          bridgePass: 'bridge-pass',
          encryptionKey: 'encryption-key',
          token: 'token',
          workspacesToken: 'workspaces-token',
          resourcesToken: 'resources-token',
        },
        sharedItemData: {
          isDeepFolder: false,
          currentFolderId: 'parentFolderId',
        },
        isUploadedFromFolder: true,
      },
    );

    expect(uploadFileSpy).toHaveBeenCalledWith(
      'user@test.com',
      expect.any(Object),
      expect.any(Function),
      expect.objectContaining({
        isTeam: true,
        ownerUserAuthenticationData: expect.objectContaining({
          bucketId: workspaceBucket,
          workspaceId: workspaceId,
        }),
      }),
      expect.any(Object),
    );
  });

  it('When uploading a personal file, then it uses personal credentials', async () => {
    const uploadFileSpy = (uploadFile as Mock).mockResolvedValueOnce(mockFile1);

    vi.spyOn(tasksService, 'create').mockReturnValue('taskId');
    vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(tasksService, 'addListener').mockReturnValue();
    vi.spyOn(tasksService, 'removeListener').mockReturnValue();
    vi.spyOn(errorService, 'castError').mockResolvedValue(new AppError('error'));

    await uploadFileWithManager(
      [
        {
          taskId: 'taskId',
          filecontent: {
            content: 'file-content' as unknown as File,
            type: 'text/plain',
            name: 'file.txt',
            size: 1024,
            parentFolderId: 'folder-1',
          },
          userEmail: 'user@test.com',
          parentFolderId: '',
        },
      ],
      openMaxSpaceOccupiedDialogMock,
      DatabaseUploadRepository.getInstance(),
      undefined,
      {
        ownerUserAuthenticationData: undefined,
        sharedItemData: {
          isDeepFolder: false,
          currentFolderId: 'parentFolderId',
        },
        isUploadedFromFolder: true,
      },
    );

    expect(uploadFileSpy).toHaveBeenCalledWith(
      'user@test.com',
      expect.any(Object),
      expect.any(Function),
      expect.objectContaining({
        isTeam: false,
        ownerUserAuthenticationData: undefined,
      }),
      expect.any(Object),
    );
  });
});
