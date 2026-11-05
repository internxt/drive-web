import tasksService from 'app/tasks/services/tasks.service';
import { TaskStatus, TaskType, UploadFileTask } from 'app/tasks/types';
import referralService from 'services/referral.service';
import { logNetworkInfoForUpload } from 'app/network/networkInformation';
import { DriveFileData } from 'app/drive/types';
import { FileToUpload } from 'app/drive/services/file.service/types';
import { UploadManager } from 'app/upload/UploadManager';
import { UploadFailureReason, UploadItem, UploadItemKind, UploadManagerEvents } from 'app/upload/types';
import RetryManager, { RetryableTaskType } from 'app/network/RetryManager';
import { OwnerUserAuthenticationData } from 'app/network/types';
import { PersistUploadRepository } from 'app/repositories/DatabaseUploadRepository';
import errorService from 'services/error.service';
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

type FolderProgress = { filesUploaded: number; totalFilesToUpload: number };

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
  relatedTaskProgress?: FolderProgress;
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

  const failureDialogByReason: Partial<Record<UploadFailureReason, () => void>> = {
    [UploadFailureReason.NoSpaceLeft]: props.maxSpaceOccupiedCallback,
    [UploadFailureReason.FileTooLarge]: props.fileSizeExceededCallback,
  };
  const reasonsWithDialogShown = new Set<UploadFailureReason>();

  const showFailureDialogOnce = (reason: UploadFailureReason) => {
    const showDialog = failureDialogByReason[reason];
    const hasNoDialog = !showDialog;
    const wasAlreadyShown = reasonsWithDialogShown.has(reason);
    if (hasNoDialog || wasAlreadyShown) return;

    reasonsWithDialogShown.add(reason);
    showDialog();
  };

  const updateFolderProgress = async (folderTaskId: string, folderProgress: FolderProgress) => {
    const folderUploadState = await uploadRepository.getUploadState(folderTaskId);
    const isPaused = folderUploadState === TaskStatus.Paused;
    if (isPaused) return;

    tasksService.updateTask({
      taskId: folderTaskId,
      merge: { progress: folderProgress.filesUploaded / folderProgress.totalFilesToUpload },
    });
  };

  const events: UploadManagerEvents = {
    onItemStarted: (item) => {
      const file = getFile(item);
      tasksService.updateTask({
        taskId: file.taskId,
        merge: { status: file.relatedTaskId ? TaskStatus.Encrypting : TaskStatus.InProcess },
      });
      if (!file.relatedTaskId) {
        uploadRepository
          .setUploadState(file.taskId, TaskStatus.InProcess)
          .catch((error) => errorService.reportError(error));
      }
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

      if (relatedTaskProgress && file.relatedTaskId) {
        relatedTaskProgress.filesUploaded += 1;
        await updateFolderProgress(file.relatedTaskId, relatedTaskProgress).catch((error) =>
          errorService.reportError(error),
        );
      }
    },

    onItemFailed: (item, { reason }) => {
      const { taskId } = getFile(item);
      tasksService.updateTask({ taskId, merge: errorMerge(reason) });
      uploadRepository.removeUploadState(taskId).catch((error) => errorService.reportError(error));
      showFailureDialogOnce(reason);
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
