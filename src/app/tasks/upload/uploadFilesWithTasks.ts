import tasksService from 'app/tasks/services/tasks.service';
import { TaskStatus, TaskType, UploadFileTask } from 'app/tasks/types';
import referralService from 'services/referral.service';
import { logNetworkInfoForUpload } from 'app/network/networkInformation';
import { DriveFileData } from 'app/drive/types';
import { FileToUpload } from 'app/drive/services/file.service/types';
import { UploadManager } from 'app/upload/UploadManager';
import { UploadItem, UploadManagerEvents } from 'app/network/types/upload';
import RetryManager, { RetryableTaskType } from 'app/network/RetryManager';
import { OwnerUserAuthenticationData, UploadFailureReason, UploadItemKind } from 'app/network/types';
import { PersistUploadRepository } from 'app/repositories/DatabaseUploadRepository';
import { forgetUploadState, markUploadAsInProcess } from 'app/repositories/uploadStateUpdates';
import { errorMerge } from './uploadTaskErrors';

export type UploadManagerFileParams = {
  filecontent: FileToUpload;
  taskId?: string;
  relatedTaskId?: string;
  fileType?: string;
  userEmail: string;
  parentFolderId: string;
  onFinishUploadFile?: (driveItemData: DriveFileData, taskId: string) => void;
  abortController?: AbortController;
};

type UploadFileParamsWithTaskId = UploadManagerFileParams & { taskId: string };

interface UploadFilesWithTasksProps {
  files: UploadManagerFileParams[];
  maxSpaceOccupiedCallback: () => void;
  fileSizeExceededCallback?: () => void;
  onFileUploadCallback?: (driveFileData: DriveFileData) => void;
  uploadRepository: PersistUploadRepository;
  abortController?: AbortController;
  options?: {
    showNotifications?: boolean;
    ownerUserAuthenticationData?: OwnerUserAuthenticationData;
    sharedItemData?: {
      isDeepFolder?: boolean;
      currentFolderId?: string;
    };
  };
  relatedTaskProgress?: { filesUploaded: number; totalFilesToUpload: number };
}

/**
 * Uploads files while tracking each one as a task: creates (or resumes) one task per
 * file, then observes the upload manager's events to keep the tasks in sync. The
 * manager itself never touches tasks.
 * @throws the first upload error once every file has settled
 */
export const uploadFilesWithTasks = async (props: UploadFilesWithTasksProps): Promise<void> => {
  const { files, options, abortController, uploadRepository, relatedTaskProgress } = props;
  const fileByItem = new Map<UploadItem, UploadFileParamsWithTaskId>();
  const getFile = (item: UploadItem) => fileByItem.get(item) as UploadFileParamsWithTaskId;
  const getPauseKey = (item: UploadItem) => {
    const file = getFile(item);
    return file.relatedTaskId ?? file.taskId;
  };

  const events: UploadManagerEvents = {
    onItemStarted: (item) => {
      const file = getFile(item);
      tasksService.updateTask({
        taskId: file.taskId,
        merge: { status: file.relatedTaskId ? TaskStatus.Encrypting : TaskStatus.InProcess },
      });
      if (!file.relatedTaskId) markUploadAsInProcess(uploadRepository, file.taskId);
    },

    onItemProgress: (item, progress) => {
      const { taskId } = getFile(item);
      const taskStatus = tasksService.findTask(taskId)?.status;
      const isTaskPaused = taskStatus === TaskStatus.Paused;
      const isTaskCancelled = taskStatus === TaskStatus.Cancelled;

      if (!isTaskCancelled && !isTaskPaused) {
        tasksService.updateTask({ taskId, merge: { progress } });
      }
    },

    onItemSucceeded: async (item, uploadedItem) => {
      const driveFileData = uploadedItem as DriveFileData;
      const file = getFile(item);

      if (relatedTaskProgress && file.relatedTaskId) {
        relatedTaskProgress.filesUploaded += 1;

        const folderUploadState = await uploadRepository.getUploadState(file.relatedTaskId);
        const isPaused = folderUploadState === TaskStatus.Paused;
        if (!isPaused) {
          tasksService.updateTask({
            taskId: file.relatedTaskId,
            merge: { progress: relatedTaskProgress.filesUploaded / relatedTaskProgress.totalFilesToUpload },
          });
        }
      }

      if (tasksService.findTask(file.taskId)?.status !== TaskStatus.Cancelled) {
        tasksService.updateTask({
          taskId: file.taskId,
          merge: { status: TaskStatus.Success, itemUUID: { fileUUID: driveFileData.uuid } },
        });
      }
      RetryManager.removeTask(file.taskId);

      referralService.trackFileUpload();
      logNetworkInfoForUpload({ fileName: file.filecontent.name, fileSize: file.filecontent.size });
      file.onFinishUploadFile?.(driveFileData, file.taskId);
      props.onFileUploadCallback?.(driveFileData);
    },

    onItemFailed: (item, { reason }) => {
      const { taskId } = getFile(item);
      tasksService.updateTask({ taskId, merge: errorMerge(reason) });
      forgetUploadState(uploadRepository, taskId);
    },

    onItemCancelled: (item) => {
      tasksService.updateTask({ taskId: getFile(item).taskId, merge: { status: TaskStatus.Cancelled } });
    },
  };

  const manager = new UploadManager({
    ownerUserAuthenticationData: options?.ownerUserAuthenticationData,
    uploadRepository,
    getPauseKey,
    events,
  });

  const items = files.map((file): UploadItem => {
    const item: UploadItem = {
      kind: UploadItemKind.File,
      file: { ...file.filecontent, type: file.fileType ?? file.filecontent.type },
    };
    fileByItem.set(item, { ...file, taskId: file.taskId ?? createUploadTask(file, item, manager, options) });
    file.abortController?.signal.addEventListener('abort', () => manager.cancelItem(item), { once: true });

    if (file.taskId) {
      tasksService.updateTask({
        taskId: file.taskId,
        merge: { status: TaskStatus.Encrypting, stop: () => Promise.resolve(manager.cancelItem(item)) },
      });
    }

    return item;
  });

  const cancelEveryFile = () => items.forEach((item) => manager.cancelItem(item));
  if (abortController?.signal.aborted) cancelEveryFile();
  abortController?.signal.addEventListener('abort', cancelEveryFile, { once: true });

  const relatedTaskId = files[0]?.relatedTaskId;
  if (relatedTaskId) {
    const folderUploadState = await uploadRepository.getUploadState(relatedTaskId);
    const isPaused = folderUploadState === TaskStatus.Paused;

    if (!isPaused) {
      tasksService.updateTask({ taskId: relatedTaskId, merge: { status: TaskStatus.InProcess } });
    }
  }

  const { failed } = await manager.run(items);

  if (failed.length > 0) {
    RetryManager.addTasks(
      failed.map(({ item, failure }) => {
        const file = getFile(item);

        return {
          taskId: file.taskId,
          type: RetryableTaskType.Upload,
          params: file,
          retryable: failure.isRetryable,
        };
      }),
    );

    const failureReasons = new Set(failed.map(({ failure }) => failure.reason));

    if (failureReasons.has(UploadFailureReason.NoSpaceLeft)) props.maxSpaceOccupiedCallback();
    if (failureReasons.has(UploadFailureReason.FileTooLarge)) props.fileSizeExceededCallback?.();

    throw failed[0].failure.error;
  }
};

const createUploadTask = (
  file: UploadManagerFileParams,
  item: UploadItem,
  manager: UploadManager,
  options: UploadFilesWithTasksProps['options'],
): string => {
  const sharedItemAuthenticationData = options?.ownerUserAuthenticationData
    ? {
        ownerUserAuthenticationData: { ...options.ownerUserAuthenticationData },
        isDeepFolder: !!options?.sharedItemData?.isDeepFolder,
        currentFolderId: options?.sharedItemData?.currentFolderId as string,
      }
    : undefined;

  return tasksService.create<UploadFileTask>({
    relatedTaskId: file.relatedTaskId,
    action: TaskType.UploadFile,
    item: { uploadFile: file.filecontent.content, parentFolderId: file.parentFolderId },
    fileName: file.filecontent.name,
    fileType: file.filecontent.type,
    isFileNameValidated: true,
    showNotification: options?.showNotifications ?? true,
    cancellable: true,
    sharedItemAuthenticationData,
    stop: () => Promise.resolve(manager.cancelItem(item)),
  });
};
