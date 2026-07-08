import tasksService from 'app/tasks/services/tasks.service';
import { TaskData, TaskEvent, TaskStatus, TaskType, UploadFolderTask } from 'app/tasks/types';
import referralService from 'services/referral.service';
import { IRoot } from '../../store/slices/storage/types';
import { logNetworkInfoForUpload } from '../networkInformation';
import { errorMerge, UploadTaskErrorReason } from './uploadTaskErrors';

export interface UploadFolderTaskCallbacks {
  createOrResumeTask: (
    root: IRoot,
    currentFolderId: string,
    options: { taskId?: string; withNotification: boolean },
  ) => string;
  markTaskInProcess: (taskId: string) => void;
  updateTaskProgress: (taskId: string, progress: number, stop: () => Promise<void>) => void;
  markTaskSuccess: (taskId: string, itemUUID: { rootFolderUUID?: string }) => void;
  markTaskError: (taskId: string, reason?: UploadTaskErrorReason) => void;
  getTaskStatus: (taskId: string) => TaskStatus | undefined;
  stopRelatedTasks: (taskId: string) => Promise<void>[];
  onTaskCancelled: (taskId: string, onCancelled: () => void) => () => void;
  onTaskUpdated: (taskId: string, onUpdated: (status: TaskStatus) => void) => () => void;
  onFolderUploaded: (info: { folderName: string }) => void;
}

export const createUploadFolderTaskLifecycle = (): UploadFolderTaskCallbacks => ({
  createOrResumeTask: (root, currentFolderId, options) => {
    if (options.taskId) {
      tasksService.updateTask({
        taskId: options.taskId,
        merge: { folderName: root.name, status: TaskStatus.InProcess, progress: 0 },
      });
      return options.taskId;
    }

    return tasksService.create<UploadFolderTask>({
      action: TaskType.UploadFolder,
      folderName: root.name,
      item: root,
      parentFolderId: currentFolderId,
      showNotification: options.withNotification,
      cancellable: true,
    });
  },

  markTaskInProcess: (taskId) =>
    tasksService.updateTask({ taskId, merge: { status: TaskStatus.InProcess, progress: 0 } }),

  updateTaskProgress: (taskId, progress, stop) => tasksService.updateTask({ taskId, merge: { progress, stop } }),

  markTaskSuccess: (taskId, itemUUID) =>
    tasksService.updateTask({ taskId, merge: { status: TaskStatus.Success, itemUUID } }),

  markTaskError: (taskId, reason) => tasksService.updateTask({ taskId, merge: errorMerge(reason) }),

  getTaskStatus: (taskId) => tasksService.findTask(taskId)?.status,

  stopRelatedTasks: (taskId) =>
    tasksService
      .getTasks({ relatedTaskId: taskId })
      .map((task) => task.stop?.())
      .filter((promise): promise is Promise<void> => promise !== undefined),

  onTaskCancelled: (taskId, onCancelled) => {
    const listener = (task: TaskData) => {
      if (task.id === taskId && task.status === TaskStatus.Cancelled) onCancelled();
    };
    tasksService.addListener({ event: TaskEvent.TaskCancelled, listener });
    return () => tasksService.removeListener({ event: TaskEvent.TaskCancelled, listener });
  },

  onTaskUpdated: (taskId, onUpdated) => {
    const listener = (task: TaskData) => {
      if (task.id === taskId) onUpdated(task.status);
    };
    tasksService.addListener({ event: TaskEvent.TaskUpdated, listener });
    return () => tasksService.removeListener({ event: TaskEvent.TaskUpdated, listener });
  },

  onFolderUploaded: ({ folderName }) => {
    referralService.trackFolderUpload();
    logNetworkInfoForUpload({ folderName });
  },
});
