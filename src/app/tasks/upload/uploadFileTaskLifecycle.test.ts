import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import tasksService from 'app/tasks/services/tasks.service';
import { TaskEvent, TaskStatus } from 'app/tasks/types';
import referralService from 'services/referral.service';
import * as networkInformation from 'app/network/networkInformation';
import { createUploadFileTaskLifecycle } from './uploadFileTaskLifecycle';

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

describe('createUploadFileTaskLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a task with the manager-provided metadata and stop callback', () => {
    (tasksService.create as Mock).mockReturnValue('new-task-id');
    const lifecycle = createUploadFileTaskLifecycle();
    const stop = vi.fn();

    const taskId = lifecycle.createTask(
      {
        filecontent: { content: 'content' as unknown as File, type: 'text/plain', name: 'file.txt', size: 10, parentFolderId: 'folder' },
        userEmail: '',
        parentFolderId: 'folder',
      },
      { showNotification: true, sharedItemAuthenticationData: undefined },
      stop,
    );

    expect(taskId).toBe('new-task-id');
    expect(tasksService.create).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: 'file.txt', fileType: 'text/plain', showNotification: true, stop }),
    );
  });

  it('sets Encrypting status and only merges stop when provided', () => {
    const lifecycle = createUploadFileTaskLifecycle();
    const stop = vi.fn();

    lifecycle.markTaskEncrypting('task-1', stop);
    expect(tasksService.updateTask).toHaveBeenCalledWith({
      taskId: 'task-1',
      merge: { status: TaskStatus.Encrypting, stop },
    });

    lifecycle.markTaskEncrypting('task-2');
    expect(tasksService.updateTask).toHaveBeenCalledWith({
      taskId: 'task-2',
      merge: { status: TaskStatus.Encrypting },
    });
  });

  it('updates progress by taskId', () => {
    const lifecycle = createUploadFileTaskLifecycle();
    lifecycle.updateTaskProgress('task-1', 0.5);
    expect(tasksService.updateTask).toHaveBeenCalledWith({ taskId: 'task-1', merge: { progress: 0.5 } });
  });

  it('marks success with the given itemUUID', () => {
    const lifecycle = createUploadFileTaskLifecycle();
    lifecycle.markTaskSuccess('task-1', { fileUUID: 'uuid-1' });
    expect(tasksService.updateTask).toHaveBeenCalledWith({
      taskId: 'task-1',
      merge: { status: TaskStatus.Success, itemUUID: { fileUUID: 'uuid-1' } },
    });
  });

  it('marks error with a subtitle when a reason is given, and without one otherwise', () => {
    const lifecycle = createUploadFileTaskLifecycle();

    lifecycle.markTaskError('task-1', 'connection-lost');
    expect(tasksService.updateTask).toHaveBeenCalledWith({
      taskId: 'task-1',
      merge: { status: TaskStatus.Error, subtitle: 'error.connectionLostError' },
    });

    lifecycle.markTaskError('task-2', 'upload-failed');
    expect(tasksService.updateTask).toHaveBeenCalledWith({
      taskId: 'task-2',
      merge: { status: TaskStatus.Error, subtitle: 'tasks.subtitles.upload-failed' },
    });

    lifecycle.markTaskError('task-3');
    expect(tasksService.updateTask).toHaveBeenCalledWith({ taskId: 'task-3', merge: { status: TaskStatus.Error } });
  });

  it('marks a task as cancelled', () => {
    const lifecycle = createUploadFileTaskLifecycle();
    lifecycle.markTaskCancelled('task-1');
    expect(tasksService.updateTask).toHaveBeenCalledWith({ taskId: 'task-1', merge: { status: TaskStatus.Cancelled } });
  });

  it('reads the current task status', () => {
    (tasksService.findTask as Mock).mockReturnValue({ status: TaskStatus.Paused });
    const lifecycle = createUploadFileTaskLifecycle();
    expect(lifecycle.getTaskStatus('task-1')).toBe(TaskStatus.Paused);
  });

  it('invokes the callback only when the cancelled task matches and unsubscribes on demand', () => {
    let registeredListener: ((task: { id: string }) => void) | undefined;
    (tasksService.addListener as Mock).mockImplementation(({ listener }) => {
      registeredListener = listener;
    });

    const lifecycle = createUploadFileTaskLifecycle();
    const onCancelled = vi.fn();
    const unsubscribe = lifecycle.onTaskCancelledExternally('task-1', onCancelled);

    registeredListener?.({ id: 'other-task' });
    expect(onCancelled).not.toHaveBeenCalled();

    registeredListener?.({ id: 'task-1' });
    expect(onCancelled).toHaveBeenCalledOnce();

    unsubscribe();
    expect(tasksService.removeListener).toHaveBeenCalledWith({ event: TaskEvent.TaskCancelled, listener: registeredListener });
  });

  it('tracks referral upload and logs network info on file upload', () => {
    const lifecycle = createUploadFileTaskLifecycle();
    lifecycle.onFileUploaded({ fileName: 'file.txt', fileSize: 1024 });

    expect(referralService.trackFileUpload).toHaveBeenCalledOnce();
    expect(networkInformation.logNetworkInfoForUpload).toHaveBeenCalledWith({ fileName: 'file.txt', fileSize: 1024 });
  });
});
