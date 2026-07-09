import tasksService from 'app/tasks/services/tasks.service';
import { SharedItemAuthenticationData, TaskData, TaskEvent, TaskStatus, TaskType, UploadFileTask } from 'app/tasks/types';
import referralService from 'services/referral.service';
import { logNetworkInfoForUpload } from 'app/network/networkInformation';
import type { UploadManagerFileParams } from 'app/network/UploadManager';
import { errorMerge, UploadTaskErrorReason } from './uploadTaskErrors';

export interface UploadFileTaskCallbacks {
  createTask: (
    file: UploadManagerFileParams,
    meta: { showNotification: boolean; sharedItemAuthenticationData?: SharedItemAuthenticationData },
    stop: () => Promise<void>,
  ) => string;
  markTaskEncrypting: (taskId: string, stop?: () => Promise<void>) => void;
  markTaskInProcess: (taskId: string) => void;
  updateTaskProgress: (taskId: string, progress: number) => void;
  markTaskSuccess: (taskId: string, itemUUID: { fileUUID: string }) => void;
  markTaskError: (taskId: string, reason?: UploadTaskErrorReason) => void;
  markTaskCancelled: (taskId: string) => void;
  getTaskStatus: (taskId: string) => TaskStatus | undefined;
  onTaskCancelledExternally: (taskId: string, onCancelled: () => void) => () => void;
  onFileUploaded: (info: { fileName: string; fileSize: number }) => void;
}

export const createUploadFileTaskLifecycle = (): UploadFileTaskCallbacks => ({
  createTask: (file, meta, stop) =>
    tasksService.create<UploadFileTask>({
      relatedTaskId: file.relatedTaskId,
      action: TaskType.UploadFile,
      item: { uploadFile: file.filecontent.content, parentFolderId: file.parentFolderId },
      fileName: file.filecontent.name,
      fileType: file.filecontent.type,
      isFileNameValidated: true,
      showNotification: meta.showNotification,
      cancellable: true,
      sharedItemAuthenticationData: meta.sharedItemAuthenticationData,
      stop,
    }),

  markTaskEncrypting: (taskId, stop) =>
    tasksService.updateTask({
      taskId,
      merge: stop ? { status: TaskStatus.Encrypting, stop } : { status: TaskStatus.Encrypting },
    }),

  markTaskInProcess: (taskId) => tasksService.updateTask({ taskId, merge: { status: TaskStatus.InProcess } }),

  updateTaskProgress: (taskId, progress) => tasksService.updateTask({ taskId, merge: { progress } }),

  markTaskSuccess: (taskId, itemUUID) =>
    tasksService.updateTask({ taskId, merge: { status: TaskStatus.Success, itemUUID } }),

  markTaskError: (taskId, reason) => tasksService.updateTask({ taskId, merge: errorMerge(reason) }),

  markTaskCancelled: (taskId) => tasksService.updateTask({ taskId, merge: { status: TaskStatus.Cancelled } }),

  getTaskStatus: (taskId) => tasksService.findTask(taskId)?.status,

  onTaskCancelledExternally: (taskId, onCancelled) => {
    const listener = (task: TaskData) => {
      if (task.id === taskId) onCancelled();
    };
    tasksService.addListener({ event: TaskEvent.TaskCancelled, listener });
    return () => tasksService.removeListener({ event: TaskEvent.TaskCancelled, listener });
  },

  onFileUploaded: ({ fileName, fileSize }) => {
    referralService.trackFileUpload();
    logNetworkInfoForUpload({ fileName, fileSize });
  },
});
