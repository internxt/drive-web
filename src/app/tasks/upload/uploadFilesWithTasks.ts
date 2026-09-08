import tasksService from 'app/tasks/services/tasks.service';
import { TaskData, TaskEvent, TaskStatus, TaskType, UploadFileTask } from 'app/tasks/types';
import referralService from 'services/referral.service';
import { logNetworkInfoForUpload } from 'app/network/networkInformation';
import { DriveFileData } from 'app/drive/types';
import {
  uploadFileWithManager,
  UploadFileParamsWithTaskId,
  UploadManagerEvents,
  UploadManagerFileParams,
} from 'app/network/UploadManager';
import { errorMerge } from './uploadTaskErrors';

type UploadFileWithManagerProps = Parameters<typeof uploadFileWithManager>[0];

interface UploadFilesWithTasksProps extends Omit<UploadFileWithManagerProps, 'files' | 'events'> {
  files: UploadManagerFileParams[];
  relatedTaskProgress?: { filesUploaded: number; totalFilesToUpload: number };
}

/**
 * Uploads files while tracking each one as a task: creates (or resumes) one task per
 * file, then observes the upload manager's events to keep the tasks in sync. The
 * manager itself never touches tasks.
 */
export const uploadFilesWithTasks = async (
  props: UploadFilesWithTasksProps,
): Promise<{ uploadedFiles: DriveFileData[] }> => {
  const { files, options, abortController, uploadRepository, relatedTaskProgress, ...managerProps } = props;

  const isRetriedUpload = files.some((file) => !!file.taskId) || !!options?.isRetriedUpload;

  const filesWithTaskId: UploadFileParamsWithTaskId[] = files.map((file) => {
    if (file.taskId) {
      tasksService.updateTask({ taskId: file.taskId, merge: { status: TaskStatus.Encrypting } });
      return { ...file, taskId: file.taskId };
    }

    const sharedItemAuthenticationData = options?.ownerUserAuthenticationData
      ? {
          ownerUserAuthenticationData: { ...options.ownerUserAuthenticationData },
          isDeepFolder: !!options?.sharedItemData?.isDeepFolder,
          currentFolderId: options?.sharedItemData?.currentFolderId as string,
        }
      : undefined;

    const taskId = tasksService.create<UploadFileTask>({
      relatedTaskId: file.relatedTaskId,
      action: TaskType.UploadFile,
      item: { uploadFile: file.filecontent.content, parentFolderId: file.parentFolderId },
      fileName: file.filecontent.name,
      fileType: file.filecontent.type,
      isFileNameValidated: true,
      showNotification: options?.showNotifications ?? true,
      cancellable: true,
      sharedItemAuthenticationData,
      stop: async () => {
        if (abortController) abortController.abort();
        else file.abortController?.abort();
      },
    });

    return { ...file, taskId };
  });

  const relatedTaskId = filesWithTaskId[0]?.relatedTaskId;
  if (relatedTaskId) {
    const isPaused = (await uploadRepository?.getUploadState(relatedTaskId)) === TaskStatus.Paused;
    if (!isPaused) {
      tasksService.updateTask({ taskId: relatedTaskId, merge: { status: TaskStatus.InProcess } });
    }
  }

  const events: UploadManagerEvents = {
    onUploadStart: (file, stopUpload) =>
      tasksService.updateTask({ taskId: file.taskId, merge: { status: TaskStatus.Encrypting, stop: stopUpload } }),

    onUploadAttempt: (file) => {
      if (!file.relatedTaskId) {
        tasksService.updateTask({ taskId: file.taskId, merge: { status: TaskStatus.InProcess } });
      }
    },

    onUploadProgress: (file, progress) => {
      const taskStatus = tasksService.findTask(file.taskId)?.status;
      const isTaskPaused = taskStatus === TaskStatus.Paused;
      const isTaskCancelled = taskStatus === TaskStatus.Cancelled;

      if (!isTaskCancelled && !isTaskPaused) {
        tasksService.updateTask({ taskId: file.taskId, merge: { progress } });
      }
    },

    onUploadSuccess: async (file, driveFileData) => {
      if (relatedTaskProgress && file.relatedTaskId) {
        relatedTaskProgress.filesUploaded += 1;

        const isPaused = (await uploadRepository?.getUploadState(file.relatedTaskId)) === TaskStatus.Paused;
        if (!isPaused) {
          tasksService.updateTask({
            taskId: file.relatedTaskId,
            merge: { progress: relatedTaskProgress.filesUploaded / relatedTaskProgress.totalFilesToUpload },
          });
        }
      }

      tasksService.updateTask({
        taskId: file.taskId,
        merge: { status: TaskStatus.Success, itemUUID: { fileUUID: driveFileData.uuid } },
      });

      referralService.trackFileUpload();
      logNetworkInfoForUpload({ fileName: file.filecontent.name, fileSize: file.filecontent.size });
    },

    onUploadError: (file, reason) => tasksService.updateTask({ taskId: file.taskId, merge: errorMerge(reason) }),

    onUploadAborted: (file) =>
      tasksService.updateTask({ taskId: file.taskId, merge: { status: TaskStatus.Cancelled } }),

    registerUploadAbort: (file, abort) => {
      const listener = (task: TaskData) => {
        if (task.id === file.taskId) abort();
      };
      tasksService.addListener({ event: TaskEvent.TaskCancelled, listener });
      return () => tasksService.removeListener({ event: TaskEvent.TaskCancelled, listener });
    },
  };

  return uploadFileWithManager({
    ...managerProps,
    files: filesWithTaskId,
    uploadRepository,
    abortController,
    options: { ...options, isRetriedUpload },
    events,
  });
};
