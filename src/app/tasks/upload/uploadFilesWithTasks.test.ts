import { beforeEach, describe, expect, Mock, test, vi } from 'vitest';
import tasksService from 'app/tasks/services/tasks.service';
import { TaskEvent, TaskStatus } from 'app/tasks/types';
import referralService from 'services/referral.service';
import * as networkInformation from 'app/network/networkInformation';
import { uploadFileWithManager, UploadManagerEvents } from 'app/network/UploadManager';
import { PersistUploadRepository } from 'app/repositories/DatabaseUploadRepository';
import { uploadFilesWithTasks } from './uploadFilesWithTasks';

vi.mock('app/network/UploadManager', () => ({
  uploadFileWithManager: vi.fn(() => Promise.resolve({ uploadedFiles: [] })),
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
  setUploadState: vi.fn(),
  removeUploadState: vi.fn(),
} as unknown as PersistUploadRepository;

const runUpload = async (files: ReturnType<typeof buildFile>[], props: Record<string, unknown> = {}) => {
  await uploadFilesWithTasks({
    files,
    maxSpaceOccupiedCallback: vi.fn(),
    uploadRepository,
    ...props,
  });
  const managerProps = (uploadFileWithManager as Mock).mock.calls[0][0];
  return { managerProps, events: managerProps.events as UploadManagerEvents };
};

describe('uploadFilesWithTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When a new file upload begins, then a task is created to track it', async () => {
    (tasksService.create as Mock).mockReturnValue('new-task-id');

    const { managerProps } = await runUpload([buildFile()]);

    expect(tasksService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: 'file.txt',
        fileType: 'text/plain',
        showNotification: true,
        cancellable: true,
      }),
    );
    expect(managerProps.files).toEqual([expect.objectContaining({ taskId: 'new-task-id' })]);
  });

  test('When an upload is retried, then its existing task resumes instead of creating a new one', async () => {
    const { managerProps } = await runUpload([buildFile({ taskId: 'existing-task' })]);

    expect(tasksService.create).not.toHaveBeenCalled();
    expect(tasksService.updateTask).toHaveBeenCalledWith({
      taskId: 'existing-task',
      merge: { status: TaskStatus.Encrypting },
    });
    expect(managerProps.options.isRetriedUpload).toBe(true);
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

  test('When a file upload starts, then its task shows it is being prepared and becomes stoppable', async () => {
    (tasksService.create as Mock).mockReturnValue('t1');
    const { events, managerProps } = await runUpload([buildFile()]);
    const stop = vi.fn();

    events.onUploadStart?.(managerProps.files[0], stop);

    expect(tasksService.updateTask).toHaveBeenCalledWith({
      taskId: 't1',
      merge: { status: TaskStatus.Encrypting, stop },
    });
  });

  test('When an upload attempt begins, then only files uploaded outside a folder show as in progress', async () => {
    (tasksService.create as Mock).mockReturnValue('t1');
    const { events, managerProps } = await runUpload([buildFile()]);

    events.onUploadAttempt?.(managerProps.files[0]);
    expect(tasksService.updateTask).toHaveBeenCalledWith({ taskId: 't1', merge: { status: TaskStatus.InProcess } });

    (tasksService.updateTask as Mock).mockClear();
    events.onUploadAttempt?.({ ...managerProps.files[0], relatedTaskId: 'related' });
    expect(tasksService.updateTask).not.toHaveBeenCalled();
  });

  test('When an upload advances, then the task progress updates unless the task is paused or cancelled', async () => {
    (tasksService.create as Mock).mockReturnValue('t1');
    const { events, managerProps } = await runUpload([buildFile()]);

    (tasksService.findTask as Mock).mockReturnValue({ status: TaskStatus.InProcess });
    events.onUploadProgress?.(managerProps.files[0], 0.5);
    expect(tasksService.updateTask).toHaveBeenCalledWith({ taskId: 't1', merge: { progress: 0.5 } });

    (tasksService.updateTask as Mock).mockClear();
    (tasksService.findTask as Mock).mockReturnValue({ status: TaskStatus.Paused });
    events.onUploadProgress?.(managerProps.files[0], 0.6);
    expect(tasksService.updateTask).not.toHaveBeenCalled();

    (tasksService.findTask as Mock).mockReturnValue({ status: TaskStatus.Cancelled });
    events.onUploadProgress?.(managerProps.files[0], 0.7);
    expect(tasksService.updateTask).not.toHaveBeenCalled();
  });

  test('When a file finishes uploading, then its task succeeds and the upload is tracked', async () => {
    (tasksService.create as Mock).mockReturnValue('t1');
    const { events, managerProps } = await runUpload([buildFile()]);

    await events.onUploadSuccess?.(managerProps.files[0], { uuid: 'file-uuid' } as never);

    expect(tasksService.updateTask).toHaveBeenCalledWith({
      taskId: 't1',
      merge: { status: TaskStatus.Success, itemUUID: { fileUUID: 'file-uuid' } },
    });
    expect(referralService.trackFileUpload).toHaveBeenCalledOnce();
    expect(networkInformation.logNetworkInfoForUpload).toHaveBeenCalledWith({ fileName: 'file.txt', fileSize: 1024 });
  });

  test('When a file inside a folder finishes uploading, then the folder progress advances', async () => {
    (tasksService.create as Mock).mockReturnValue('t1');
    const relatedTaskProgress = { filesUploaded: 0, totalFilesToUpload: 4 };
    const { events, managerProps } = await runUpload([buildFile({ relatedTaskId: 'related-task' })], {
      relatedTaskProgress,
    });

    await events.onUploadSuccess?.(managerProps.files[0], { uuid: 'file-uuid' } as never);

    expect(relatedTaskProgress.filesUploaded).toBe(1);
    expect(tasksService.updateTask).toHaveBeenCalledWith({
      taskId: 'related-task',
      merge: { progress: 0.25 },
    });
  });

  test('When an upload fails, then the task shows an error message matching the cause', async () => {
    (tasksService.create as Mock).mockReturnValue('t1');
    const { events, managerProps } = await runUpload([buildFile()]);

    events.onUploadError?.(managerProps.files[0], 'connection-lost');
    expect(tasksService.updateTask).toHaveBeenCalledWith({
      taskId: 't1',
      merge: { status: TaskStatus.Error, subtitle: 'error.connectionLostError' },
    });

    events.onUploadError?.(managerProps.files[0], 'upload-failed');
    expect(tasksService.updateTask).toHaveBeenCalledWith({
      taskId: 't1',
      merge: { status: TaskStatus.Error, subtitle: 'tasks.subtitles.upload-failed' },
    });

    events.onUploadError?.(managerProps.files[0]);
    expect(tasksService.updateTask).toHaveBeenCalledWith({ taskId: 't1', merge: { status: TaskStatus.Error } });
  });

  test('When an upload is aborted, then its task shows as cancelled', async () => {
    (tasksService.create as Mock).mockReturnValue('t1');
    const { events, managerProps } = await runUpload([buildFile()]);

    events.onUploadAborted?.(managerProps.files[0]);

    expect(tasksService.updateTask).toHaveBeenCalledWith({ taskId: 't1', merge: { status: TaskStatus.Cancelled } });
  });

  test('When a task is cancelled by the user, then only that upload is stopped', async () => {
    (tasksService.create as Mock).mockReturnValue('t1');
    let registeredListener: ((task: { id: string }) => void) | undefined;
    (tasksService.addListener as Mock).mockImplementation(({ listener }) => {
      registeredListener = listener;
    });

    const { events, managerProps } = await runUpload([buildFile()]);
    const abort = vi.fn();
    const unsubscribe = events.registerUploadAbort?.(managerProps.files[0], abort);

    registeredListener?.({ id: 'other-task' });
    expect(abort).not.toHaveBeenCalled();

    registeredListener?.({ id: 't1' });
    expect(abort).toHaveBeenCalledOnce();

    unsubscribe?.();
    expect(tasksService.removeListener).toHaveBeenCalledWith({
      event: TaskEvent.TaskCancelled,
      listener: registeredListener,
    });
  });
});
