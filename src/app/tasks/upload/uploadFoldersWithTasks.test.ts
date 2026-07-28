import { beforeEach, describe, expect, Mock, test, vi } from 'vitest';
import tasksService from 'app/tasks/services/tasks.service';
import { TaskEvent, TaskStatus } from 'app/tasks/types';
import referralService from 'services/referral.service';
import * as networkInformation from 'app/network/networkInformation';
import { uploadFoldersWithManager, UploadFolderManagerEvents } from 'app/network/UploadFolderManager';
import { IRoot } from 'app/store/slices/storage/types';
import { uploadFoldersWithTasks } from './uploadFoldersWithTasks';

vi.mock('app/network/UploadFolderManager', () => ({
  uploadFoldersWithManager: vi.fn(() => Promise.resolve()),
}));

vi.mock('app/tasks/services/tasks.service', () => ({
  default: {
    create: vi.fn(),
    updateTask: vi.fn(),
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

vi.mock('app/network/networkInformation', () => ({
  logNetworkInfoForUpload: vi.fn(),
}));

const root: IRoot = { name: 'Folder', childrenFiles: [], childrenFolders: [], folderId: 'parent', fullPathEdited: '' };

const runUpload = async (
  payload: Parameters<typeof uploadFoldersWithTasks>[0]['payload'],
  props: Record<string, unknown> = {},
) => {
  await uploadFoldersWithTasks({
    payload,
    selectedWorkspace: null,
    dispatch: vi.fn() as never,
    maxUploadFileSize: 100,
    ...props,
  });
  const managerProps = (uploadFoldersWithManager as Mock).mock.calls[0][0];
  return { managerProps, events: managerProps.events as UploadFolderManagerEvents };
};

describe('uploadFoldersWithTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When a folder upload is retried, then its existing task resumes instead of creating a new one', async () => {
    const { managerProps } = await runUpload([
      { root, currentFolderId: 'parent', options: { taskId: 'existing-task', withNotification: true } },
    ]);

    expect(tasksService.updateTask).toHaveBeenCalledWith({
      taskId: 'existing-task',
      merge: { folderName: 'Folder', status: TaskStatus.InProcess, progress: 0 },
    });
    expect(tasksService.create).not.toHaveBeenCalled();
    expect(managerProps.payload[0].options.taskId).toBe('existing-task');
  });

  test('When a new folder upload begins, then a task is created to track it', async () => {
    (tasksService.create as Mock).mockReturnValue('created-task-id');

    const { managerProps } = await runUpload([
      { root, currentFolderId: 'parent', options: { withNotification: false } },
    ]);

    expect(tasksService.create).toHaveBeenCalledWith(
      expect.objectContaining({ folderName: 'Folder', parentFolderId: 'parent', showNotification: false }),
    );
    expect(managerProps.payload[0].options.taskId).toBe('created-task-id');
  });

  test('When a folder upload starts, then the task shows the final folder name and can cancel, pause and resume it', async () => {
    (tasksService.create as Mock).mockReturnValue('task-1');
    const listeners: Record<string, (task: { id: string; status: TaskStatus }) => void> = {};
    (tasksService.addListener as Mock).mockImplementation(({ event, listener }) => {
      listeners[event] = listener;
    });

    const { events } = await runUpload([{ root, currentFolderId: 'parent' }]);
    const controls = { cancelUpload: vi.fn(), pauseUpload: vi.fn(), resumeUpload: vi.fn() };

    const cleanup = events.onFolderUploadStarted?.('task-1', { ...root, name: 'Folder (1)' }, controls);

    expect(tasksService.updateTask).toHaveBeenCalledWith({
      taskId: 'task-1',
      merge: { folderName: 'Folder (1)', status: TaskStatus.InProcess, progress: 0 },
    });

    listeners[TaskEvent.TaskCancelled]?.({ id: 'other-task', status: TaskStatus.Cancelled });
    expect(controls.cancelUpload).not.toHaveBeenCalled();
    listeners[TaskEvent.TaskCancelled]?.({ id: 'task-1', status: TaskStatus.Cancelled });
    expect(controls.cancelUpload).toHaveBeenCalledOnce();

    listeners[TaskEvent.TaskUpdated]?.({ id: 'task-1', status: TaskStatus.Paused });
    expect(controls.pauseUpload).toHaveBeenCalledOnce();
    listeners[TaskEvent.TaskUpdated]?.({ id: 'task-1', status: TaskStatus.InProcess });
    expect(controls.resumeUpload).toHaveBeenCalledOnce();

    cleanup?.();
    expect(tasksService.removeListener).toHaveBeenCalledTimes(2);
  });

  test('When a folder upload advances, then the task progress updates and the upload stays stoppable', async () => {
    (tasksService.create as Mock).mockReturnValue('task-1');
    const { events } = await runUpload([{ root, currentFolderId: 'parent' }]);
    const stop = vi.fn();

    events.onFolderUploadProgress?.('task-1', 0.25, stop);

    expect(tasksService.updateTask).toHaveBeenCalledWith({ taskId: 'task-1', merge: { progress: 0.25, stop } });
  });

  test('When a folder finishes uploading, then its task succeeds and the upload is tracked', async () => {
    (tasksService.create as Mock).mockReturnValue('task-1');
    const onFolderUploadSucceeded = vi.fn();
    const { events } = await runUpload([{ root, currentFolderId: 'parent' }], { onFolderUploadSucceeded });

    events.onFolderUploadSuccess?.('task-1', { folderName: 'MyFolder', rootFolderUUID: 'root-uuid' });

    expect(tasksService.updateTask).toHaveBeenCalledWith({
      taskId: 'task-1',
      merge: { status: TaskStatus.Success, itemUUID: { rootFolderUUID: 'root-uuid' } },
    });
    expect(referralService.trackFolderUpload).toHaveBeenCalledOnce();
    expect(networkInformation.logNetworkInfoForUpload).toHaveBeenCalledWith({ folderName: 'MyFolder' });
    expect(onFolderUploadSucceeded).toHaveBeenCalledWith('task-1');
  });

  test('When a folder upload fails, then the task shows an error message matching the cause', async () => {
    (tasksService.create as Mock).mockReturnValue('task-1');
    const { events } = await runUpload([{ root, currentFolderId: 'parent' }]);

    events.onFolderUploadError?.('task-1', 'connection-lost');

    expect(tasksService.updateTask).toHaveBeenCalledWith({
      taskId: 'task-1',
      merge: { status: TaskStatus.Error, subtitle: 'error.connectionLostError' },
    });
  });

  test('When a folder upload stops, then its ongoing file uploads are stopped too', async () => {
    (tasksService.create as Mock).mockReturnValue('task-1');
    const resolvedStop = Promise.resolve();
    (tasksService.getTasks as Mock).mockReturnValue([{ stop: () => resolvedStop }, { stop: undefined }, {}]);

    const { events } = await runUpload([{ root, currentFolderId: 'parent' }]);
    const promises = events.stopRelatedUploads?.('task-1');

    expect(tasksService.getTasks).toHaveBeenCalledWith({ relatedTaskId: 'task-1' });
    expect(promises).toEqual([resolvedStop]);
  });
});
