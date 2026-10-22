import { beforeEach, describe, expect, Mock, test, vi } from 'vitest';
import { UploadFileParamsWithTaskId, uploadFileWithManager, UploadManagerEvents } from './UploadManager';
import errorService from 'services/error.service';
import { AppError } from '@internxt/sdk';
import uploadFile from 'app/drive/services/file.service/uploadFile';
import DatabaseUploadRepository, { PersistUploadRepository } from 'app/repositories/DatabaseUploadRepository';
import { DriveFileData } from 'app/drive/types';
import RetryManager, { RetryableTaskType } from './RetryManager';
import { TaskStatus } from 'app/tasks/types';
import { ErrorMessages } from 'app/core/constants';

vi.mock('app/drive/services/file.service/uploadFile', () => ({
  default: vi.fn(() => Promise.resolve({} as DriveFileData)),
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

describe('UploadManager memory usage conditions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When memory usage cannot be measured, then the upload still proceeds', async () => {
    const originalPerformance = window.performance;
    Object.defineProperty(window, 'performance', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const uploadFileSpy = (uploadFile as Mock).mockResolvedValueOnce(mockFile1);
    vi.spyOn(errorService, 'castError').mockReturnValue(new AppError('error'));

    await uploadFileWithManager({
      files: [
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
      maxSpaceOccupiedCallback: openMaxSpaceOccupiedDialogMock,
      uploadRepository: DatabaseUploadRepository.getInstance(),
      options: {
        ownerUserAuthenticationData: undefined,
        sharedItemData: {
          isDeepFolder: false,
          currentFolderId: 'parentFolderId',
        },
        isUploadedFromFolder: true,
      },
    });

    expect(uploadFileSpy).toHaveBeenCalledOnce();

    Object.defineProperty(window, 'performance', {
      value: originalPerformance,
      writable: true,
      configurable: true,
    });
  });

  test('When memory usage readings are incomplete, then the upload still proceeds', async () => {
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
    vi.spyOn(errorService, 'castError').mockReturnValue(new AppError('error'));

    await uploadFileWithManager({
      files: [
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
      maxSpaceOccupiedCallback: openMaxSpaceOccupiedDialogMock,
      uploadRepository: DatabaseUploadRepository.getInstance(),
      options: {
        ownerUserAuthenticationData: undefined,
        sharedItemData: {
          isDeepFolder: false,
          currentFolderId: 'parentFolderId',
        },
        isUploadedFromFolder: true,
      },
    });

    expect(uploadFileSpy).toHaveBeenCalledOnce();

    Object.defineProperty(window, 'performance', {
      value: originalPerformance,
      writable: true,
      configurable: true,
    });
  });
});

describe('uploadFileWithManager', () => {
  beforeEach(() => {
    RetryManager.clearTasks();
    vi.clearAllMocks();
  });

  test('When a file upload succeeds, then the success is notified with the uploaded file data', async () => {
    const uploadFileSpy = (uploadFile as Mock).mockResolvedValueOnce(mockFile1);
    const events: UploadManagerEvents = { onUploadSuccess: vi.fn() };
    vi.spyOn(errorService, 'castError').mockReturnValue(new AppError('error'));

    await uploadFileWithManager({
      files: [
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
      maxSpaceOccupiedCallback: openMaxSpaceOccupiedDialogMock,
      uploadRepository: DatabaseUploadRepository.getInstance(),
      events,
      options: {
        ownerUserAuthenticationData: undefined,
        sharedItemData: {
          isDeepFolder: false,
          currentFolderId: 'parentFolderId',
        },
        isUploadedFromFolder: true,
      },
    });

    expect(uploadFileSpy).toHaveBeenCalledOnce();
    expect(events.onUploadSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: 'taskId' }),
      expect.objectContaining({ uuid: mockFile1.uuid, name: 'file.txt' }),
    );
  });

  test('When several files are uploaded, then every file is transferred', async () => {
    const uploadFileSpy = (uploadFile as Mock).mockResolvedValueOnce(mockFile1).mockResolvedValueOnce(mockFile2);

    vi.spyOn(errorService, 'castError').mockReturnValue(new AppError('error'));

    await uploadFileWithManager({
      files: [
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
      maxSpaceOccupiedCallback: openMaxSpaceOccupiedDialogMock,
      uploadRepository: DatabaseUploadRepository.getInstance(),
      options: {
        ownerUserAuthenticationData: undefined,
        sharedItemData: {
          isDeepFolder: false,
          currentFolderId: 'parentFolderId',
        },
        isUploadedFromFolder: true,
      },
    });

    expect(uploadFileSpy).toHaveBeenCalledTimes(2);
  });

  test('When the upload is cancelled midway, then it is notified as cancelled and not as a failure', async () => {
    const abortController = new AbortController();
    (uploadFile as Mock).mockImplementation(() => {
      abortController.abort();
      return Promise.reject(new Error('abort'));
    });
    const events: UploadManagerEvents = { onUploadAborted: vi.fn(), onUploadError: vi.fn() };

    await uploadFileWithManager({
      files: [
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
      maxSpaceOccupiedCallback: openMaxSpaceOccupiedDialogMock,
      uploadRepository: DatabaseUploadRepository.getInstance(),
      abortController,
      events,
      options: {
        ownerUserAuthenticationData: undefined,
        sharedItemData: {
          isDeepFolder: false,
          currentFolderId: 'parentFolderId',
        },
        isUploadedFromFolder: true,
      },
    });

    expect(events.onUploadAborted).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'taskId' }));
    expect(events.onUploadError).not.toHaveBeenCalled();
  });

  test('When an upload succeeds, then it is no longer scheduled for retry', async () => {
    (uploadFile as Mock).mockResolvedValueOnce(mockFile1);
    vi.spyOn(Promise, 'all').mockResolvedValueOnce([mockFile1]);
    const RetryAddFilesSpy = vi.spyOn(RetryManager, 'addTasks');
    const RetryRemoveFileSpy = vi.spyOn(RetryManager, 'removeTask');

    vi.spyOn(errorService, 'castError').mockReturnValue(new AppError('error'));

    await uploadFileWithManager({
      files: [
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
      maxSpaceOccupiedCallback: openMaxSpaceOccupiedDialogMock,
      uploadRepository: DatabaseUploadRepository.getInstance(),
      options: {
        ownerUserAuthenticationData: undefined,
        sharedItemData: {
          isDeepFolder: false,
          currentFolderId: 'parentFolderId',
        },
        isUploadedFromFolder: true,
      },
    });

    expect(RetryAddFilesSpy).not.toHaveBeenCalled();
    expect(RetryRemoveFileSpy).toHaveBeenCalledWith('taskId');
  });

  test('When an upload keeps failing, then it is scheduled for retry', async () => {
    //needs to fail twice because MAX_UPLOAD_ATTEMPTS = 2
    (uploadFile as Mock)
      .mockResolvedValueOnce(mockFile1)
      .mockRejectedValueOnce(new AppError('Retryable file'))
      .mockRejectedValueOnce(new AppError('Retryable file'));
    vi.spyOn(Promise, 'all').mockResolvedValueOnce([mockFile1, undefined]);
    const RetryAddFilesSpy = vi.spyOn(RetryManager, 'addTasks');

    vi.spyOn(errorService, 'castError').mockImplementation((e) => e as AppError);

    await uploadFileWithManager({
      files: [
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
      maxSpaceOccupiedCallback: openMaxSpaceOccupiedDialogMock,
      uploadRepository: DatabaseUploadRepository.getInstance(),
      options: {
        ownerUserAuthenticationData: undefined,
        sharedItemData: {
          isDeepFolder: false,
          currentFolderId: 'parentFolderId',
        },
        isUploadedFromFolder: true,
      },
    });

    expect(RetryAddFilesSpy).toHaveBeenCalled();
    expect(RetryManager.getTasks()).toHaveLength(1);
  });

  test('When a retried upload fails again, then it is marked as failed', async () => {
    //needs to fail twice because MAX_UPLOAD_ATTEMPTS = 2
    (uploadFile as Mock)
      .mockRejectedValueOnce(new AppError('Retryable file'))
      .mockRejectedValueOnce(new AppError('Retryable file'));
    vi.spyOn(Promise, 'all').mockResolvedValueOnce([undefined]);
    const RetryChangeStatusSpy = vi.spyOn(RetryManager, 'changeStatus');

    vi.spyOn(errorService, 'castError').mockImplementation((e) => e as AppError);

    await uploadFileWithManager({
      files: [
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
      maxSpaceOccupiedCallback: openMaxSpaceOccupiedDialogMock,
      uploadRepository: DatabaseUploadRepository.getInstance(),
      options: {
        ownerUserAuthenticationData: undefined,
        sharedItemData: {
          isDeepFolder: false,
          currentFolderId: 'parentFolderId',
        },
        isUploadedFromFolder: true,
      },
    });

    expect(RetryChangeStatusSpy).toHaveBeenCalledWith('taskId', 'failed');
  });

  test('When the connection is lost during an upload, then the failure is notified as a connection loss', async () => {
    const lostConnectionError = new AppError(ErrorMessages.NetworkError);
    (uploadFile as Mock).mockRejectedValueOnce(lostConnectionError);

    const events: UploadManagerEvents = { onUploadError: vi.fn() };
    vi.spyOn(errorService, 'castError').mockImplementation((e) => e as AppError);
    vi.spyOn(errorService, 'reportError').mockReturnValue();

    await expect(
      uploadFileWithManager({
        files: [
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
        maxSpaceOccupiedCallback: openMaxSpaceOccupiedDialogMock,
        uploadRepository: DatabaseUploadRepository.getInstance(),
        events,
        options: {
          ownerUserAuthenticationData: undefined,
          sharedItemData: {
            isDeepFolder: false,
            currentFolderId: 'parentFolderId',
          },
          isUploadedFromFolder: true,
        },
      }),
    ).rejects.toThrow(lostConnectionError);

    expect(errorService.reportError).toHaveBeenCalledWith(lostConnectionError);
    expect(events.onUploadError).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'taskId' }), 'connection-lost');
  });

  test('When an upload fails unexpectedly, then the failure is notified and no success is reported', async () => {
    const unexpectedError = new AppError(ErrorMessages.ServerUnavailable);
    (uploadFile as Mock).mockRejectedValue(unexpectedError);

    const events: UploadManagerEvents = { onUploadError: vi.fn(), onUploadSuccess: vi.fn() };
    vi.spyOn(errorService, 'castError').mockImplementation((e) => e as AppError);
    const errorServiceSpy = vi.spyOn(errorService, 'reportError').mockReturnValue();

    await expect(
      uploadFileWithManager({
        files: [
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
        maxSpaceOccupiedCallback: openMaxSpaceOccupiedDialogMock,
        uploadRepository: DatabaseUploadRepository.getInstance(),
        events,
        options: {
          ownerUserAuthenticationData: undefined,
          sharedItemData: {
            isDeepFolder: false,
            currentFolderId: 'parentFolderId',
          },
          isUploadedFromFolder: true,
        },
      }),
    ).rejects.toThrow(unexpectedError);

    expect(errorServiceSpy).toHaveBeenCalledWith(unexpectedError);
    expect(events.onUploadError).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'taskId' }), 'upload-failed');
    expect(events.onUploadSuccess).not.toHaveBeenCalled();
  });

  test('When uploading a file to a workspace, then the workspace credentials are used', async () => {
    const workspaceBucket = 'workspace-bucket-123';
    const workspaceId = 'workspace-id-456';
    const uploadFileSpy = (uploadFile as Mock).mockResolvedValueOnce(mockFile1);

    vi.spyOn(errorService, 'castError').mockReturnValue(new AppError('error'));

    await uploadFileWithManager({
      files: [
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
      maxSpaceOccupiedCallback: openMaxSpaceOccupiedDialogMock,
      uploadRepository: DatabaseUploadRepository.getInstance(),
      options: {
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
    });

    expect(uploadFileSpy).toHaveBeenCalledWith(
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

  test('When uploading a personal file, then the personal credentials are used', async () => {
    const uploadFileSpy = (uploadFile as Mock).mockResolvedValueOnce(mockFile1);

    vi.spyOn(errorService, 'castError').mockReturnValue(new AppError('error'));

    await uploadFileWithManager({
      files: [
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
      maxSpaceOccupiedCallback: openMaxSpaceOccupiedDialogMock,
      uploadRepository: DatabaseUploadRepository.getInstance(),
      options: {
        ownerUserAuthenticationData: undefined,
        sharedItemData: {
          isDeepFolder: false,
          currentFolderId: 'parentFolderId',
        },
        isUploadedFromFolder: true,
      },
    });

    expect(uploadFileSpy).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Function),
      expect.objectContaining({
        isTeam: false,
        ownerUserAuthenticationData: undefined,
      }),
      expect.any(Object),
    );
  });

  test('When a file of a folder upload fails, then the remaining files still upload and the failure is reported at the end', async () => {
    const err = new AppError(ErrorMessages.ServerUnavailable);
    (uploadFile as Mock).mockImplementation((file: { name: string }) =>
      file.name === 'failing.txt' ? Promise.reject(err) : Promise.resolve(mockFile2),
    );

    const events: UploadManagerEvents = { onUploadSuccess: vi.fn(), onUploadError: vi.fn() };
    vi.spyOn(errorService, 'castError').mockImplementation((e) => e as AppError);
    vi.spyOn(errorService, 'reportError').mockReturnValue();

    await expect(
      uploadFileWithManager({
        files: [
          {
            taskId: 'failing-task',
            relatedTaskId: 'folder-task',
            filecontent: {
              content: 'file-content1' as unknown as File,
              type: 'text/plain',
              name: 'failing.txt',
              size: 1024,
              parentFolderId: 'folder-1',
            },
            userEmail: '',
            parentFolderId: '',
          },
          {
            taskId: 'succeeding-task',
            relatedTaskId: 'folder-task',
            filecontent: {
              content: 'file-content2' as unknown as File,
              type: 'text/plain',
              name: 'file2.txt',
              size: 1024,
              parentFolderId: 'folder-1',
            },
            userEmail: '',
            parentFolderId: '',
          },
        ],
        maxSpaceOccupiedCallback: openMaxSpaceOccupiedDialogMock,
        uploadRepository: DatabaseUploadRepository.getInstance(),
        events,
        options: {
          ownerUserAuthenticationData: undefined,
          sharedItemData: {
            isDeepFolder: false,
            currentFolderId: 'parentFolderId',
          },
          isUploadedFromFolder: true,
        },
      }),
    ).rejects.toThrow(err);

    expect(events.onUploadError).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: 'failing-task' }),
      'upload-failed',
    );
    expect(events.onUploadSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: 'succeeding-task' }),
      expect.objectContaining({ uuid: mockFile2.uuid }),
    );

    const retryTasks = RetryManager.getTasks();
    expect(retryTasks).toHaveLength(1);
    expect(retryTasks[0]).toMatchObject({ taskId: 'failing-task', type: 'upload', retryable: true });
  });

  test('When a retried upload fails again, then its retry entry is kept as-is instead of being duplicated', async () => {
    const err = new AppError(ErrorMessages.ServerUnavailable);
    (uploadFile as Mock).mockRejectedValue(err);

    vi.spyOn(errorService, 'castError').mockImplementation((e) => e as AppError);
    vi.spyOn(errorService, 'reportError').mockReturnValue();

    const fileParams = {
      taskId: 'retried-task',
      filecontent: {
        content: 'file-content' as unknown as File,
        type: 'text/plain',
        name: 'file.txt',
        size: 1024,
        parentFolderId: 'folder-1',
      },
      userEmail: '',
      parentFolderId: '',
    };
    RetryManager.addTasks([
      { taskId: 'retried-task', type: RetryableTaskType.Upload, params: fileParams, retryable: true },
    ]);

    await expect(
      uploadFileWithManager({
        files: [fileParams],
        maxSpaceOccupiedCallback: openMaxSpaceOccupiedDialogMock,
        uploadRepository: DatabaseUploadRepository.getInstance(),
        options: {
          ownerUserAuthenticationData: undefined,
          sharedItemData: {
            isDeepFolder: false,
            currentFolderId: 'parentFolderId',
          },
          isUploadedFromFolder: true,
          isRetriedUpload: true,
        },
      }),
    ).rejects.toThrow(err);

    const retryTasks = RetryManager.getTasks();
    expect(retryTasks).toHaveLength(1);
    expect(retryTasks[0]).toMatchObject({ taskId: 'retried-task', retryable: true });
  });

  test('When a file of a folder upload fails with a non-retryable error, then it is not retried and cannot be retried later', async () => {
    const paymentRequiredError = new AppError('Payment required', 402);
    (uploadFile as Mock).mockRejectedValue(paymentRequiredError);

    vi.spyOn(errorService, 'castError').mockImplementation((e) => e as AppError);
    vi.spyOn(errorService, 'reportError').mockReturnValue();

    await expect(
      uploadFileWithManager({
        files: [
          {
            taskId: 'not-allowed-task',
            relatedTaskId: 'folder-task',
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
        maxSpaceOccupiedCallback: openMaxSpaceOccupiedDialogMock,
        uploadRepository: DatabaseUploadRepository.getInstance(),
        options: {
          ownerUserAuthenticationData: undefined,
          sharedItemData: {
            isDeepFolder: false,
            currentFolderId: 'parentFolderId',
          },
          isUploadedFromFolder: true,
        },
      }),
    ).rejects.toThrow(paymentRequiredError);

    expect(uploadFile).toHaveBeenCalledOnce();
    const retryTasks = RetryManager.getTasks();
    expect(retryTasks).toHaveLength(1);
    expect(retryTasks[0]).toMatchObject({ taskId: 'not-allowed-task', retryable: false });
  });

  test('When the user has no storage space left, then they are warned about it', async () => {
    const err = new AppError('Max space used', 420);
    // needs to fail twice because MAX_UPLOAD_ATTEMPTS = 2
    (uploadFile as Mock).mockRejectedValue(err);

    vi.spyOn(errorService, 'castError').mockImplementation((e) => e as AppError);
    vi.spyOn(errorService, 'reportError').mockReturnValue();

    await expect(
      uploadFileWithManager({
        files: [
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
        maxSpaceOccupiedCallback: openMaxSpaceOccupiedDialogMock,
        uploadRepository: DatabaseUploadRepository.getInstance(),
        options: {
          ownerUserAuthenticationData: undefined,
          sharedItemData: {
            isDeepFolder: false,
            currentFolderId: 'parentFolderId',
          },
          isUploadedFromFolder: true,
        },
      }),
    ).rejects.toThrow(err);

    expect(openMaxSpaceOccupiedDialogMock).toHaveBeenCalledOnce();
  });
});

describe('UploadManager settles every queued file', () => {
  const HANG_TIMEOUT_MS = 2000;
  const uploadStateError = new Error('IDB failure');

  const failIfHangs = <T>(promise: Promise<T>): Promise<T> =>
    Promise.race([
      promise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('upload never settled')), HANG_TIMEOUT_MS)),
    ]);

  const buildFile = (name: string): UploadFileParamsWithTaskId => ({
    taskId: `${name}-task`,
    filecontent: {
      content: name as unknown as File,
      type: 'text/plain',
      name,
      size: 1024,
      parentFolderId: 'folder-1',
    },
    userEmail: '',
    parentFolderId: '',
  });

  const buildRepository = (failingUploadStateCalls: Record<string, number[]> = {}): PersistUploadRepository => {
    const callsByTaskId: Record<string, number> = {};
    return {
      setUploadState: vi.fn(async () => undefined),
      removeUploadState: vi.fn(async () => undefined),
      getUploadState: vi.fn(async (id: string) => {
        callsByTaskId[id] = (callsByTaskId[id] ?? 0) + 1;
        if (failingUploadStateCalls[id]?.includes(callsByTaskId[id])) throw uploadStateError;
        return undefined;
      }),
    };
  };

  const runUpload = ({
    files,
    uploadRepository = buildRepository(),
    events,
    isUploadedFromFolder = false,
  }: {
    files: UploadFileParamsWithTaskId[];
    uploadRepository?: PersistUploadRepository;
    events?: UploadManagerEvents;
    isUploadedFromFolder?: boolean;
  }) =>
    failIfHangs(
      uploadFileWithManager({
        files,
        maxSpaceOccupiedCallback: openMaxSpaceOccupiedDialogMock,
        uploadRepository,
        events,
        options: { isUploadedFromFolder },
      }),
    );

  const uploadedNames = () => (uploadFile as Mock).mock.calls.map(([file]) => file.name);

  beforeEach(() => {
    RetryManager.clearTasks();
    vi.clearAllMocks();
    vi.spyOn(errorService, 'castError').mockImplementation((e) => (e ?? new AppError('Unknown error')) as AppError);
    vi.spyOn(errorService, 'reportError').mockReturnValue();
    (uploadFile as Mock).mockImplementation(async (file: { name: string }) => ({ ...mockFile1, name: file.name }));
  });

  test('when reading the upload state keeps failing, then the upload settles and the file is reported as failed', async () => {
    const file = buildFile('file.txt');
    const events: UploadManagerEvents = { onUploadError: vi.fn() };
    const uploadRepository = buildRepository({ [file.taskId]: [1, 2] });

    await expect(runUpload({ files: [file], uploadRepository, events })).rejects.toThrow(uploadStateError);

    expect(uploadFile).not.toHaveBeenCalled();
    expect(events.onUploadError).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: file.taskId }),
      'upload-failed',
    );
  });

  test('when reading the upload state fails on the retry after a 502, then the folder upload settles with the file failed and the others uploaded', async () => {
    const failingFile = buildFile('failing.txt');
    const otherFiles = [buildFile('a.txt'), buildFile('b.txt')];
    (uploadFile as Mock).mockImplementationOnce(() => Promise.reject({ status: 502 }));
    const uploadRepository = buildRepository({ [failingFile.taskId]: [2] });
    const events: UploadManagerEvents = { onUploadSuccess: vi.fn(), onUploadError: vi.fn() };

    await expect(
      runUpload({ files: [failingFile, ...otherFiles], uploadRepository, events, isUploadedFromFolder: true }),
    ).rejects.toThrow(uploadStateError);

    expect(events.onUploadSuccess).toHaveBeenCalledTimes(otherFiles.length);
    expect(events.onUploadError).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: failingFile.taskId }),
      'upload-failed',
    );
    expect(RetryManager.getTasks()).toEqual([expect.objectContaining({ taskId: failingFile.taskId, retryable: true })]);
  });

  test('when the upload rejects without an error value, then the upload settles and the file is reported as failed', async () => {
    (uploadFile as Mock).mockRejectedValue(undefined);
    const events: UploadManagerEvents = { onUploadError: vi.fn() };

    await expect(runUpload({ files: [buildFile('file.txt')], events })).rejects.toThrow('Unknown error');

    expect(events.onUploadError).toHaveBeenCalledWith(expect.anything(), 'upload-failed');
  });

  test('when a success listener throws, then every file is uploaded once and the queue keeps processing', async () => {
    const files = ['a.txt', 'b.txt', 'c.txt'].map(buildFile);
    const onFileUploadCallback = vi.fn();
    const events: UploadManagerEvents = {
      onUploadSuccess: vi.fn((file) => {
        if (file.taskId === files[0].taskId) throw new Error('listener failure');
      }),
    };

    const { uploadedFiles } = await failIfHangs(
      uploadFileWithManager({
        files,
        maxSpaceOccupiedCallback: openMaxSpaceOccupiedDialogMock,
        uploadRepository: buildRepository(),
        events,
        onFileUploadCallback,
      }),
    );

    expect(uploadedNames()).toEqual(['a.txt', 'b.txt', 'c.txt']);
    expect(uploadedFiles.map(({ name }) => name)).toEqual(['a.txt', 'b.txt', 'c.txt']);
    expect(onFileUploadCallback).toHaveBeenCalledTimes(files.length);
  });

  test('when a listener throws while the next queued file starts, then finished files are not uploaded again and the folder upload settles', async () => {
    const files = Array.from({ length: 7 }, (_, i) => buildFile(`f${i}.txt`));
    const startingFile = files[6];
    const listenerError = new Error('listener failure');
    const events: UploadManagerEvents = {
      onUploadStart: vi.fn((file) => {
        if (file.taskId === startingFile.taskId) throw listenerError;
      }),
      onUploadSuccess: vi.fn(),
    };

    await expect(runUpload({ files, events, isUploadedFromFolder: true })).rejects.toThrow(listenerError);

    expect(uploadedNames()).toEqual(files.slice(0, 6).map((file) => file.filecontent.name));
    expect(events.onUploadSuccess).toHaveBeenCalledTimes(6);
    expect(RetryManager.getTasks()).toEqual([expect.objectContaining({ taskId: startingFile.taskId })]);
  });
});
