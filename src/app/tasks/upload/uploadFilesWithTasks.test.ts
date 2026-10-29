import { beforeEach, describe, expect, Mock, test, vi } from 'vitest';
import { UploadFailure } from 'app/network/uploadFailure';
import { UploadFailureReason, UploadItemKind } from 'app/network/types';
import tasksService from 'app/tasks/services/tasks.service';
import { TaskStatus } from 'app/tasks/types';
import referralService from 'services/referral.service';
import * as networkInformation from 'app/network/networkInformation';
import { UploadManager } from 'app/upload/UploadManager';
import { UploadItem, UploadManagerEvents, UploadResult } from 'app/network/types/upload';
import RetryManager from 'app/network/RetryManager';
import { PersistUploadRepository } from 'app/repositories/DatabaseUploadRepository';
import { uploadFilesWithTasks } from './uploadFilesWithTasks';

const { managerState } = vi.hoisted(() => ({
  managerState: {
    result: { succeeded: [], failed: [] } as UploadResult,
    instance: undefined as
      | undefined
      | { props: { events: UploadManagerEvents }; run: Mock; cancelAll: Mock; cancelItem: Mock; items: UploadItem[] },
  },
}));

vi.mock('app/upload/UploadManager', () => ({
  UploadManager: vi.fn(function (this: NonNullable<typeof managerState.instance>, props) {
    this.props = props;
    this.cancelAll = vi.fn();
    this.cancelItem = vi.fn();
    this.run = vi.fn(async (items: UploadItem[]) => {
      this.items = items;
      return managerState.result;
    });
    managerState.instance = this;
  }),
}));

vi.mock('app/tasks/services/tasks.service', () => ({
  default: {
    create: vi.fn(),
    updateTask: vi.fn(),
    findTask: vi.fn(),
  },
}));

vi.mock('i18next', () => ({ t: (key: string) => key }));

vi.mock('services/referral.service', () => ({
  default: {
    trackFileUpload: vi.fn(),
  },
}));

vi.mock('app/network/networkInformation', () => ({
  logNetworkInfoForUpload: vi.fn(),
}));

const buildFile = (overrides: Record<string, unknown> = {}) => ({
  filecontent: {
    content: 'content' as unknown as File,
    type: 'text/plain',
    name: 'file.txt',
    size: 1024,
    parentFolderId: 'folder',
  },
  userEmail: '',
  parentFolderId: 'folder',
  ...overrides,
});

const uploadRepository = {
  getUploadState: vi.fn(),
  setUploadState: vi.fn(() => Promise.resolve()),
  removeUploadState: vi.fn(() => Promise.resolve()),
} as unknown as PersistUploadRepository;

const runUpload = async (files: ReturnType<typeof buildFile>[], props: Record<string, unknown> = {}) => {
  await uploadFilesWithTasks({
    files,
    maxSpaceOccupiedCallback: vi.fn(),
    uploadRepository,
    ...props,
  });
  const manager = managerState.instance as NonNullable<typeof managerState.instance>;
  return { manager, events: manager.props.events, items: manager.items };
};

const failWith = (failure: Partial<UploadFailure>) => {
  vi.mocked(UploadManager).mockImplementationOnce(function (this: NonNullable<typeof managerState.instance>, props) {
    this.props = props;
    this.run = vi.fn(async (items: UploadItem[]) => ({
      succeeded: [],
      failed: [{ item: items[0], failure: { error: new Error('failed'), isRetryable: true, ...failure } }],
    }));
    managerState.instance = this;
  } as never);
};

describe('Uploading files with tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    RetryManager.clearTasks();
    managerState.result = { succeeded: [], failed: [] };
    (tasksService.findTask as Mock).mockReturnValue(undefined);
  });

  test('When a new file upload begins, then a task is created to track it', async () => {
    (tasksService.create as Mock).mockReturnValue('new-task-id');

    const { items } = await runUpload([buildFile()]);

    expect(tasksService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: 'file.txt',
        fileType: 'text/plain',
        showNotification: true,
        cancellable: true,
      }),
    );
    expect(items).toEqual([{ kind: UploadItemKind.File, file: buildFile().filecontent }]);
  });

  test('When an upload is retried, then its existing task resumes instead of creating a new one', async () => {
    await runUpload([buildFile({ taskId: 'existing-task' })]);

    expect(tasksService.create).not.toHaveBeenCalled();
    expect(tasksService.updateTask).toHaveBeenCalledWith({
      taskId: 'existing-task',
      merge: { status: TaskStatus.Encrypting, stop: expect.any(Function) },
    });
  });

  test('When files from a folder upload begin, then the folder task shows as in progress', async () => {
    (tasksService.create as Mock).mockReturnValue('t1');
    (uploadRepository.getUploadState as Mock).mockResolvedValueOnce(undefined);

    await runUpload([buildFile({ relatedTaskId: 'related-task' })]);

    expect(tasksService.updateTask).toHaveBeenCalledWith({
      taskId: 'related-task',
      merge: { status: TaskStatus.InProcess },
    });
  });

  test('When the folder task is paused, then it does not resume by itself', async () => {
    (tasksService.create as Mock).mockReturnValue('t1');
    (uploadRepository.getUploadState as Mock).mockResolvedValueOnce(TaskStatus.Paused);

    await runUpload([buildFile({ relatedTaskId: 'related-task' })]);

    expect(tasksService.updateTask).not.toHaveBeenCalledWith({
      taskId: 'related-task',
      merge: { status: TaskStatus.InProcess },
    });
  });

  test('When a file upload starts, then only files uploaded outside a folder show as in progress', async () => {
    (tasksService.create as Mock).mockReturnValueOnce('loose-task').mockReturnValueOnce('folder-file-task');
    const { events, items } = await runUpload([buildFile(), buildFile({ relatedTaskId: 'related' })]);

    events.onItemStarted?.(items[0]);
    events.onItemStarted?.(items[1]);

    expect(tasksService.updateTask).toHaveBeenCalledWith({
      taskId: 'loose-task',
      merge: { status: TaskStatus.InProcess },
    });
    expect(tasksService.updateTask).toHaveBeenCalledWith({
      taskId: 'folder-file-task',
      merge: { status: TaskStatus.Encrypting },
    });
  });

  test('When an upload advances, then the task progress updates unless the task is paused or cancelled', async () => {
    (tasksService.create as Mock).mockReturnValue('t1');
    const { events, items } = await runUpload([buildFile()]);

    (tasksService.findTask as Mock).mockReturnValue({ status: TaskStatus.InProcess });
    events.onItemProgress?.(items[0], 0.5);
    expect(tasksService.updateTask).toHaveBeenCalledWith({ taskId: 't1', merge: { progress: 0.5 } });

    (tasksService.updateTask as Mock).mockClear();
    (tasksService.findTask as Mock).mockReturnValue({ status: TaskStatus.Paused });
    events.onItemProgress?.(items[0], 0.6);
    (tasksService.findTask as Mock).mockReturnValue({ status: TaskStatus.Cancelled });
    events.onItemProgress?.(items[0], 0.7);
    expect(tasksService.updateTask).not.toHaveBeenCalled();
  });

  test('When a file finishes uploading, then its task succeeds, the upload is tracked and the caller is told', async () => {
    (tasksService.create as Mock).mockReturnValue('t1');
    const onFinishUploadFile = vi.fn();
    const onFileUploadCallback = vi.fn();
    const { events, items } = await runUpload([buildFile({ onFinishUploadFile })], { onFileUploadCallback });
    const driveFile = { uuid: 'file-uuid' } as never;

    await events.onItemSucceeded?.(items[0], driveFile);

    expect(tasksService.updateTask).toHaveBeenCalledWith({
      taskId: 't1',
      merge: { status: TaskStatus.Success, itemUUID: { fileUUID: 'file-uuid' } },
    });
    expect(referralService.trackFileUpload).toHaveBeenCalledOnce();
    expect(networkInformation.logNetworkInfoForUpload).toHaveBeenCalledWith({ fileName: 'file.txt', fileSize: 1024 });
    expect(onFinishUploadFile).toHaveBeenCalledWith(driveFile, 't1');
    expect(onFileUploadCallback).toHaveBeenCalledWith(driveFile);
  });

  test('When a retried file finishes uploading, then it leaves the retry list', async () => {
    RetryManager.addTasks([{ taskId: 'existing-task', type: 'upload' as never, params: {} }]);
    const { events, items } = await runUpload([buildFile({ taskId: 'existing-task' })]);

    await events.onItemSucceeded?.(items[0], { uuid: 'file-uuid' } as never);

    expect(RetryManager.getTasks()).toEqual([]);
  });

  test('When a file inside a folder finishes uploading, then the folder progress advances', async () => {
    (tasksService.create as Mock).mockReturnValue('t1');
    const relatedTaskProgress = { filesUploaded: 0, totalFilesToUpload: 4 };
    const { events, items } = await runUpload([buildFile({ relatedTaskId: 'related-task' })], {
      relatedTaskProgress,
    });

    await events.onItemSucceeded?.(items[0], { uuid: 'file-uuid' } as never);

    expect(relatedTaskProgress.filesUploaded).toBe(1);
    expect(tasksService.updateTask).toHaveBeenCalledWith({
      taskId: 'related-task',
      merge: { progress: 0.25 },
    });
  });

  test('When an upload fails, then the task shows an error message matching the cause', async () => {
    (tasksService.create as Mock).mockReturnValue('t1');
    const { events, items } = await runUpload([buildFile()]);
    const failure = { error: new Error('failed'), isRetryable: true };

    events.onItemFailed?.(items[0], { ...failure, reason: UploadFailureReason.ConnectionLost });
    expect(tasksService.updateTask).toHaveBeenCalledWith({
      taskId: 't1',
      merge: { status: TaskStatus.Error, subtitle: 'error.connectionLostError' },
    });

    events.onItemFailed?.(items[0], { ...failure, reason: UploadFailureReason.UploadFailed });
    expect(tasksService.updateTask).toHaveBeenCalledWith({
      taskId: 't1',
      merge: { status: TaskStatus.Error, subtitle: 'tasks.subtitles.upload-failed' },
    });
  });

  test('When an upload is cancelled, then its task shows as cancelled', async () => {
    (tasksService.create as Mock).mockReturnValue('t1');
    const { events, items } = await runUpload([buildFile()]);

    events.onItemCancelled?.(items[0]);

    expect(tasksService.updateTask).toHaveBeenCalledWith({ taskId: 't1', merge: { status: TaskStatus.Cancelled } });
  });

  test('When a task is stopped by the user, then only that upload is cancelled', async () => {
    const { manager, items } = await runUpload([buildFile(), buildFile()]);
    const [{ stop }] = (tasksService.create as Mock).mock.calls[0] as [{ stop: () => Promise<void> }];

    await stop();

    expect(manager.cancelItem).toHaveBeenCalledExactlyOnceWith(items[0]);
  });

  test('When the folder upload that owns the files is cancelled, then the whole upload is cancelled', async () => {
    const abortController = new AbortController();
    const { manager } = await runUpload([buildFile()], { abortController });

    abortController.abort();

    expect(manager.cancelAll).toHaveBeenCalledOnce();
  });

  test('When a file fails, then it is listed for retry and the upload rejects with its error', async () => {
    (tasksService.create as Mock).mockReturnValue('t1');
    const error = new Error('Server error');
    failWith({ error, reason: UploadFailureReason.UploadFailed, isRetryable: false });

    await expect(runUpload([buildFile()])).rejects.toThrow(error);

    expect(RetryManager.getTasks()).toEqual([
      expect.objectContaining({ taskId: 't1', retryable: false, params: expect.objectContaining({ taskId: 't1' }) }),
    ]);
  });

  test.each([
    { problem: 'the storage is full', reason: UploadFailureReason.NoSpaceLeft, callback: 'maxSpaceOccupiedCallback' },
    {
      problem: 'the file is too large',
      reason: UploadFailureReason.FileTooLarge,
      callback: 'fileSizeExceededCallback',
    },
  ] as const)('When $problem, then the user is warned about it', async ({ reason, callback }) => {
    const warn = vi.fn();
    failWith({ reason });

    await expect(runUpload([buildFile()], { [callback]: warn })).rejects.toThrow();

    expect(warn).toHaveBeenCalledOnce();
  });
});
