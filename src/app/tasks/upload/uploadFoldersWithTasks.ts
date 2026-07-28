import tasksService from 'app/tasks/services/tasks.service';
import { TaskData, TaskEvent, TaskStatus, TaskType, UploadFolderTask } from 'app/tasks/types';
import referralService from 'services/referral.service';
import { IRoot } from 'app/store/slices/storage/types';
import { logNetworkInfoForUpload } from 'app/network/networkInformation';
import {
  uploadFoldersWithManager,
  UploadFolderManagerEvents,
  UploadFolderPayload,
} from 'app/network/UploadFolderManager';
import { errorMerge } from './uploadTaskErrors';

type UploadFoldersWithManagerProps = Parameters<typeof uploadFoldersWithManager>[0];

interface UploadFolderTasksPayload {
  root: IRoot;
  currentFolderId: string;
  options?: {
    taskId?: string;
    withNotification?: boolean;
    onSuccess?: () => void;
  };
}

interface UploadFoldersWithTasksProps extends Omit<UploadFoldersWithManagerProps, 'payload' | 'events'> {
  payload: UploadFolderTasksPayload[];
  onFolderUploadSucceeded?: (taskId: string) => void;
}

const createOrResumeTask = (folder: UploadFolderTasksPayload): string => {
  const options = { withNotification: true, ...folder.options };

  if (options.taskId) {
    tasksService.updateTask({
      taskId: options.taskId,
      merge: { folderName: folder.root.name, status: TaskStatus.InProcess, progress: 0 },
    });
    return options.taskId;
  }

  return tasksService.create<UploadFolderTask>({
    action: TaskType.UploadFolder,
    folderName: folder.root.name,
    item: folder.root,
    parentFolderId: folder.currentFolderId,
    showNotification: !!options.withNotification,
    cancellable: true,
  });
};

/**
 * Uploads folders while tracking each one as a task: creates (or resumes) one task per
 * root folder, then observes the upload manager's events to keep the tasks in sync.
 * The manager itself never touches tasks.
 */
export const uploadFoldersWithTasks = (props: UploadFoldersWithTasksProps): Promise<void> => {
  const { payload, onFolderUploadSucceeded, ...managerProps } = props;

  const payloadWithTaskIds: UploadFolderPayload[] = payload.map((folder) => ({
    root: folder.root,
    currentFolderId: folder.currentFolderId,
    options: {
      taskId: createOrResumeTask(folder),
      onSuccess: folder.options?.onSuccess,
    },
  }));

  const events: UploadFolderManagerEvents = {
    onFolderUploadStarted: (taskId, root, controls) => {
      tasksService.updateTask({
        taskId,
        merge: { folderName: root.name, status: TaskStatus.InProcess, progress: 0 },
      });

      const cancelListener = (task: TaskData) => {
        if (task.id === taskId && task.status === TaskStatus.Cancelled) controls.cancelUpload();
      };
      const updateListener = (task: TaskData) => {
        if (task.id !== taskId) return;
        if (task.status === TaskStatus.InProcess) controls.resumeUpload();
        else if (task.status === TaskStatus.Paused) controls.pauseUpload();
      };
      tasksService.addListener({ event: TaskEvent.TaskCancelled, listener: cancelListener });
      tasksService.addListener({ event: TaskEvent.TaskUpdated, listener: updateListener });

      return () => {
        tasksService.removeListener({ event: TaskEvent.TaskCancelled, listener: cancelListener });
        tasksService.removeListener({ event: TaskEvent.TaskUpdated, listener: updateListener });
      };
    },

    onFolderUploadProgress: (taskId, progress, stopUpload) =>
      tasksService.updateTask({ taskId, merge: { progress, stop: stopUpload } }),

    onFolderUploadSuccess: (taskId, { folderName, rootFolderUUID }) => {
      tasksService.updateTask({ taskId, merge: { status: TaskStatus.Success, itemUUID: { rootFolderUUID } } });
      referralService.trackFolderUpload();
      logNetworkInfoForUpload({ folderName });
      onFolderUploadSucceeded?.(taskId);
    },

    onFolderUploadError: (taskId, reason) => tasksService.updateTask({ taskId, merge: errorMerge(reason) }),

    stopRelatedUploads: (taskId) =>
      tasksService
        .getTasks({ relatedTaskId: taskId })
        .map((task) => task.stop?.())
        .filter((promise): promise is Promise<void> => promise !== undefined),
  };

  return uploadFoldersWithManager({ ...managerProps, payload: payloadWithTaskIds, events });
};
