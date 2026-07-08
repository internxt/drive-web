import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import tasksService from 'app/tasks/services/tasks.service';
import { TaskStatus } from 'app/tasks/types';
import referralService from 'services/referral.service';
import * as networkInformation from '../networkInformation';
import { createUploadFolderTaskLifecycle } from './uploadFolderTaskLifecycle';

vi.mock('app/tasks/services/tasks.service', () => ({
  default: {
    create: vi.fn(),
    updateTask: vi.fn(),
    findTask: vi.fn(),
    getTasks: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
}));

vi.mock('i18next', () => ({ t: (key: string) => key }));

vi.mock('services/referral.service', () => ({
  default: {
    trackFolderUpload: vi.fn(),
  },
}));

vi.mock('../networkInformation', () => ({
  logNetworkInfoForUpload: vi.fn(),
}));

describe('createUploadFolderTaskLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resumes an existing task when a taskId is given', () => {
    const lifecycle = createUploadFolderTaskLifecycle();
    const taskId = lifecycle.createOrResumeTask(
      { name: 'Folder', childrenFiles: [], childrenFolders: [], folderId: 'parent', fullPathEdited: '' },
      'parent',
      { taskId: 'existing-task', withNotification: true },
    );

    expect(taskId).toBe('existing-task');
    expect(tasksService.updateTask).toHaveBeenCalledWith({
      taskId: 'existing-task',
      merge: { folderName: 'Folder', status: TaskStatus.InProcess, progress: 0 },
    });
    expect(tasksService.create).not.toHaveBeenCalled();
  });

  it('creates a new task when no taskId is given', () => {
    (tasksService.create as Mock).mockReturnValue('created-task-id');
    const lifecycle = createUploadFolderTaskLifecycle();

    const taskId = lifecycle.createOrResumeTask(
      { name: 'Folder', childrenFiles: [], childrenFolders: [], folderId: 'parent', fullPathEdited: '' },
      'parent',
      { withNotification: false },
    );

    expect(taskId).toBe('created-task-id');
    expect(tasksService.create).toHaveBeenCalledWith(
      expect.objectContaining({ folderName: 'Folder', parentFolderId: 'parent', showNotification: false }),
    );
  });

  it('marks the task InProcess resetting progress', () => {
    const lifecycle = createUploadFolderTaskLifecycle();
    lifecycle.markTaskInProcess('task-1');
    expect(tasksService.updateTask).toHaveBeenCalledWith({
      taskId: 'task-1',
      merge: { status: TaskStatus.InProcess, progress: 0 },
    });
  });

  it('updates progress and stop callback together', () => {
    const lifecycle = createUploadFolderTaskLifecycle();
    const stop = vi.fn();
    lifecycle.updateTaskProgress('task-1', 0.25, stop);
    expect(tasksService.updateTask).toHaveBeenCalledWith({ taskId: 'task-1', merge: { progress: 0.25, stop } });
  });

  it('filters out related tasks without a stop function', () => {
    const resolvedStop = Promise.resolve();
    (tasksService.getTasks as Mock).mockReturnValue([{ stop: () => resolvedStop }, { stop: undefined }, {}]);

    const lifecycle = createUploadFolderTaskLifecycle();
    const promises = lifecycle.stopRelatedTasks('task-1');

    expect(tasksService.getTasks).toHaveBeenCalledWith({ relatedTaskId: 'task-1' });
    expect(promises).toEqual([resolvedStop]);
  });

  it('only calls onCancelled for the matching cancelled task', () => {
    let registeredListener: ((task: { id: string; status: TaskStatus }) => void) | undefined;
    (tasksService.addListener as Mock).mockImplementation(({ listener }) => {
      registeredListener = listener;
    });

    const lifecycle = createUploadFolderTaskLifecycle();
    const onCancelled = vi.fn();
    lifecycle.onTaskCancelled('task-1', onCancelled);

    registeredListener?.({ id: 'task-1', status: TaskStatus.InProcess });
    expect(onCancelled).not.toHaveBeenCalled();

    registeredListener?.({ id: 'task-1', status: TaskStatus.Cancelled });
    expect(onCancelled).toHaveBeenCalledOnce();
  });

  it('forwards the updated status for the matching task', () => {
    let registeredListener: ((task: { id: string; status: TaskStatus }) => void) | undefined;
    (tasksService.addListener as Mock).mockImplementation(({ listener }) => {
      registeredListener = listener;
    });

    const lifecycle = createUploadFolderTaskLifecycle();
    const onUpdated = vi.fn();
    lifecycle.onTaskUpdated('task-1', onUpdated);

    registeredListener?.({ id: 'other-task', status: TaskStatus.Paused });
    expect(onUpdated).not.toHaveBeenCalled();

    registeredListener?.({ id: 'task-1', status: TaskStatus.Paused });
    expect(onUpdated).toHaveBeenCalledWith(TaskStatus.Paused);
  });

  it('tracks referral upload and logs network info on folder upload', () => {
    const lifecycle = createUploadFolderTaskLifecycle();
    lifecycle.onFolderUploaded({ folderName: 'MyFolder' });

    expect(referralService.trackFolderUpload).toHaveBeenCalledOnce();
    expect(networkInformation.logNetworkInfoForUpload).toHaveBeenCalledWith({ folderName: 'MyFolder' });
  });
});
