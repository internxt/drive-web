import { WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { AnyAction, ThunkDispatch } from '@reduxjs/toolkit';
import { queue, QueueObject } from 'async';
import errorService from 'services/error.service';
import newStorageService from 'app/drive/services/new-storage.service';
import { DriveFolderData, DriveItemData } from 'app/drive/types';
import { RootState } from '../store';
import { checkFolderDuplicated } from '../store/slices/storage/folderUtils/checkFolderDuplicated';
import { createFolder } from '../store/slices/storage/folderUtils/createFolder';
import { getUniqueFolderName } from '../store/slices/storage/folderUtils/getUniqueFolderName';
import { deleteItemsThunk } from '../store/slices/storage/storage.thunks/deleteItemsThunk';
import { uploadItemsParallelThunk } from '../store/slices/storage/storage.thunks/uploadItemsThunk';
import { IRoot } from '../store/slices/storage/types';
import { TaskStatus } from '../tasks/types';
import { QueueUtilsService } from 'utils/queueUtils';
import { wait } from 'utils/timeUtils';
import { ConnectionLostError } from './requests';
import { FilesExceedsSizeLimitError } from 'app/drive/services/file.service/upload.errors';
import { filterFilesByMaxSize } from 'app/store/slices/storage/fileUtils/filterFilesByMaxSize';
import { createUploadFolderTaskLifecycle, UploadFolderTaskCallbacks } from './upload/uploadFolderTaskLifecycle';

interface UploadFolderPayload {
  root: IRoot;
  currentFolderId: string;
  options?: {
    taskId?: string;
    withNotification?: boolean;
    onSuccess?: () => void;
  };
}

export interface TaskFolder {
  root: IRoot;
  currentFolderId: string;
  options?: {
    withNotification?: boolean;
    onSuccess?: () => void;
  };
  taskId: string;
  abortController: AbortController;
}

interface TaskInfo {
  rootFolderItem?: DriveFolderData;
  progress: {
    itemsUploaded: number;
    totalItems: number;
  };
}

const generateTaskIdForFolders = async (
  foldersPayload: UploadFolderPayload[],
  taskLifecycle: UploadFolderTaskCallbacks,
): Promise<TaskFolder[]> => {
  const taskFolders: TaskFolder[] = [];

  for (const folder of foldersPayload) {
    const { root: originalRoot, currentFolderId, options: payloadOptions } = folder;
    const options = { withNotification: true, ...payloadOptions };
    const root = await handleFoldersRename(originalRoot, currentFolderId);

    const uploadFolderAbortController = new AbortController();

    const taskId = taskLifecycle.createOrResumeTask(root, currentFolderId, {
      taskId: options?.taskId,
      withNotification: !!options.withNotification,
    });

    taskFolders.push({
      root,
      currentFolderId,
      options: payloadOptions,
      taskId,
      abortController: uploadFolderAbortController,
    });
  }
  return taskFolders;
};

const countItemsUnderRoot = (root: IRoot): number => {
  let count = 1;

  const queueOfFolders: Array<IRoot> = [root];

  while (queueOfFolders.length > 0) {
    const folder = queueOfFolders.shift() as IRoot;
    count += folder.childrenFiles.length;

    if (folder.childrenFolders) {
      count += folder.childrenFolders.length;
      queueOfFolders.push(...folder.childrenFolders);
    }
  }

  return count;
};

const handleFoldersRename = async (root: IRoot, currentFolderId: string) => {
  const { duplicatedFoldersResponse } = await checkFolderDuplicated([root], currentFolderId);

  let finalFilename = root.name;
  if (duplicatedFoldersResponse.length > 0) {
    finalFilename = await getUniqueFolderName(
      root.name,
      duplicatedFoldersResponse as DriveFolderData[],
      currentFolderId,
    );
  }

  const folder: IRoot = { ...root, name: finalFilename };
  return folder;
};

export const uploadFoldersWithManager = ({
  payload,
  selectedWorkspace,
  dispatch,
  maxUploadFileSize,
  taskLifecycle,
  fileSizeExceededCallback,
  onFolderUploadSucceeded,
}: {
  payload: UploadFolderPayload[];
  selectedWorkspace: WorkspaceData | null;
  dispatch: ThunkDispatch<RootState, unknown, AnyAction>;
  maxUploadFileSize: number;
  taskLifecycle?: UploadFolderTaskCallbacks;
  fileSizeExceededCallback?: (exceededFiles: File[]) => void;
  onFolderUploadSucceeded?: (taskId: string) => void;
}): Promise<void> => {
  const uploadFoldersManager = new UploadFoldersManager(
    payload,
    selectedWorkspace,
    dispatch,
    maxUploadFileSize,
    taskLifecycle ?? createUploadFolderTaskLifecycle(),
    fileSizeExceededCallback,
    onFolderUploadSucceeded,
  );
  return uploadFoldersManager.run();
};

export class UploadFoldersManager {
  private static readonly MAX_CONCURRENT_UPLOADS = 6;
  private static readonly MAX_UPLOAD_ATTEMPTS = 2;

  private readonly payload: UploadFolderPayload[];
  private readonly selectedWorkspace: WorkspaceData | null;
  private readonly dispatch: ThunkDispatch<RootState, unknown, AnyAction>;
  private readonly abortController?: AbortController;
  private readonly maxUploadFileSize: number;
  private readonly taskLifecycle: UploadFolderTaskCallbacks;
  private readonly fileSizeExceededCallback?: (exceededFiles: File[]) => void;
  private readonly onFolderUploadSucceeded?: (taskId: string) => void;

  private tasksInfo: Record<string, TaskInfo> = {};

  constructor(
    payload: UploadFolderPayload[],
    selectedWorkspace: WorkspaceData | null,
    dispatch: ThunkDispatch<RootState, unknown, AnyAction>,
    maxUploadFileSize: number,
    taskLifecycle: UploadFolderTaskCallbacks,
    fileSizeExceededCallback?: (exceededFiles: File[]) => void,
    onFolderUploadSucceeded?: (taskId: string) => void,
  ) {
    this.payload = payload;
    this.selectedWorkspace = selectedWorkspace;
    this.dispatch = dispatch;
    this.maxUploadFileSize = maxUploadFileSize;
    this.taskLifecycle = taskLifecycle;
    this.fileSizeExceededCallback = fileSizeExceededCallback;
    this.onFolderUploadSucceeded = onFolderUploadSucceeded;
  }

  private readonly uploadFoldersQueue: QueueObject<TaskFolder> = queue<TaskFolder>(
    (task, next: (err: Error | null, res?: DriveFolderData) => void) => {
      if (this.abortController?.signal.aborted) return;

      const newConcurrency = QueueUtilsService.instance.getConcurrencyUsingPerformance(
        this.uploadFoldersQueue.concurrency,
        UploadFoldersManager.MAX_CONCURRENT_UPLOADS,
      );
      if (this.uploadFoldersQueue.concurrency !== newConcurrency) {
        this.uploadFoldersQueue.concurrency = newConcurrency;
      }

      this.uploadFolderAsync(task)
        .then((uploadedFolder: DriveFolderData | undefined) => {
          next(null, uploadedFolder);
        })
        .catch((e) => {
          next(e);
        });
    },
    UploadFoldersManager.MAX_CONCURRENT_UPLOADS,
  );

  private readonly createFolderWithRetry = async (
    level: IRoot,
    currentFolderId: string,
    taskId: string,
    abortController: AbortController,
  ): Promise<DriveFolderData | undefined> => {
    let createdFolder: DriveFolderData | undefined;
    let uploadAttempts = 0;

    while (!createdFolder && uploadAttempts < UploadFoldersManager.MAX_UPLOAD_ATTEMPTS) {
      uploadAttempts++;
      try {
        createdFolder = await createFolder(
          {
            parentFolderId: level.folderId as string,
            folderName: level.name,
            options: { relatedTaskId: taskId, showErrors: false },
          },
          currentFolderId,
          this.selectedWorkspace,
          { dispatch: this.dispatch },
        );
      } catch {
        if (uploadAttempts >= UploadFoldersManager.MAX_UPLOAD_ATTEMPTS) {
          this.stopUploadTask(taskId, abortController);
          this.killQueueAndNotifyError(taskId);
          return;
        }
      }
    }

    return createdFolder;
  };

  private readonly updateTaskProgress = (taskId: string, abortController: AbortController): void => {
    this.tasksInfo[taskId].progress.itemsUploaded += 1;
    this.taskLifecycle.updateTaskProgress(
      taskId,
      this.tasksInfo[taskId].progress.itemsUploaded / this.tasksInfo[taskId].progress.totalItems,
      () => this.stopUploadTask(taskId, abortController),
    );
  };

  private readonly handleFileUploads = async (
    level: IRoot,
    createdFolder: DriveFolderData,
    taskId: string,
    abortController: AbortController,
  ): Promise<void> => {
    if (level.childrenFiles.length === 0) return;
    if (abortController.signal.aborted) return;

    const hasNoChildFolders = level.childrenFolders.length === 0;
    const { exceededFiles } = filterFilesByMaxSize({
      files: level.childrenFiles,
      maxUploadFileSize: this.maxUploadFileSize,
    });
    const allFilesExceedSizeLimit =
      exceededFiles.length === level.childrenFiles.length && level.childrenFiles.length > 0;

    if (allFilesExceedSizeLimit && hasNoChildFolders) {
      await this.stopUploadTask(taskId, abortController);
      this.killQueueAndNotifyError(taskId);

      this.fileSizeExceededCallback?.(level.childrenFiles);
      throw new FilesExceedsSizeLimitError();
    }

    await this.dispatch(
      uploadItemsParallelThunk({
        files: level.childrenFiles,
        parentFolderId: createdFolder.uuid,
        options: {
          relatedTaskId: taskId,
          showNotifications: false,
          showErrors: false,
          abortController: abortController,
          disableDuplicatedNamesCheck: true,
          disableExistenceCheck: true,
          isUploadedFromFolder: true,
          notUploadHiddenFiles: true,
        },
        onFileUploadCallback: () => this.updateTaskProgress(taskId, abortController),
      }),
    )
      .unwrap()
      .catch(() => {
        this.stopUploadTask(taskId, abortController);
        this.killQueueAndNotifyError(taskId);
        return;
      });
  };

  private readonly queueChildFolders = (level: IRoot, createdFolder: DriveFolderData, taskFolder: TaskFolder): void => {
    for (const child of level.childrenFolders) {
      if (taskFolder.abortController.signal.aborted) return;

      this.uploadFoldersQueue.push({
        root: { ...child, folderId: createdFolder.uuid },
        currentFolderId: taskFolder.currentFolderId,
        options: taskFolder.options,
        abortController: taskFolder.abortController,
        taskId: taskFolder.taskId,
      });
    }
  };

  private readonly uploadFolderAsync = async (taskFolder: TaskFolder) => {
    const { root: level, currentFolderId, taskId, abortController } = taskFolder;

    if (abortController.signal.aborted) return;

    const createdFolder = await this.createFolderWithRetry(level, currentFolderId, taskId, abortController);
    if (!createdFolder) return;

    if (!this.tasksInfo[taskId].rootFolderItem) {
      this.tasksInfo[taskId].rootFolderItem = createdFolder;
    }

    this.updateTaskProgress(taskId, abortController);

    if (level.childrenFiles.length > 0 || level.childrenFolders.length > 0) {
      // Added wait in order to allow enough time for the server to create the folder
      await wait(600);
    }

    await this.handleFileUploads(level, createdFolder, taskId, abortController);
    this.queueChildFolders(level, createdFolder, taskFolder);

    return createdFolder;
  };

  private readonly stopUploadTask = async (taskId: string, uploadFolderAbortController: AbortController) => {
    uploadFolderAbortController.abort();
    const promises: Promise<void>[] = [];

    // Cancels related tasks
    promises.push(...this.taskLifecycle.stopRelatedTasks(taskId));
    // Deletes the root folder
    const rootFolderItem = this.tasksInfo[taskId].rootFolderItem;
    if (rootFolderItem) {
      promises.push(
        this.dispatch(deleteItemsThunk([rootFolderItem as DriveItemData])).unwrap(),
        newStorageService.deleteFolderByUuid(rootFolderItem.uuid),
      );
    }
    await Promise.allSettled(promises);
  };

  private readonly killQueueAndNotifyError = (taskId: string) => {
    this.uploadFoldersQueue.kill();
    this.taskLifecycle.markTaskError(taskId, 'upload-failed');
  };

  public readonly run = async (): Promise<void> => {
    const payloadWithTaskId = await generateTaskIdForFolders(this.payload, this.taskLifecycle);

    const context = typeof window === 'undefined' ? self : window;

    let connectionLost = false;

    function connectionLostListener() {
      connectionLost = true;
      context.removeEventListener('offline', connectionLostListener);
    }
    context.addEventListener('offline', connectionLostListener);

    for (const taskFolder of payloadWithTaskId) {
      const { root, currentFolderId, options: payloadOptions, taskId } = taskFolder;
      const options = { withNotification: true, ...payloadOptions };

      this.tasksInfo[taskId] = {
        progress: {
          itemsUploaded: 0,
          totalItems: countItemsUnderRoot(root),
        },
      };

      this.taskLifecycle.markTaskInProcess(taskId);

      const unsubscribeCancelListener = this.taskLifecycle.onTaskCancelled(taskId, () => {
        this.uploadFoldersQueue.kill();
      });

      const unsubscribeUpdateListener = this.taskLifecycle.onTaskUpdated(taskId, (status) => {
        if (status === TaskStatus.InProcess) {
          this.uploadFoldersQueue.resume();
        } else if (status === TaskStatus.Paused) {
          this.uploadFoldersQueue.pause();
        }
      });

      try {
        root.folderId = currentFolderId;
        await this.uploadFoldersQueue.pushAsync(taskFolder);

        while (this.uploadFoldersQueue.running() > 0 || this.uploadFoldersQueue.length() > 0) {
          await this.uploadFoldersQueue.drain();
        }

        if (connectionLost) throw new ConnectionLostError();

        this.taskLifecycle.markTaskSuccess(taskId, { rootFolderUUID: this.tasksInfo[taskId].rootFolderItem?.uuid });

        options.onSuccess?.();
        this.taskLifecycle.onFolderUploaded({ folderName: root.name });
        this.onFolderUploadSucceeded?.(taskId);
      } catch (err: unknown) {
        const castedError = errorService.castError(err);
        const updatedTaskStatus = this.taskLifecycle.getTaskStatus(taskId);

        if (connectionLost) {
          this.taskLifecycle.markTaskError(taskId, 'connection-lost');
          errorService.reportError(castedError);
          break;
        } else if (updatedTaskStatus !== undefined && updatedTaskStatus !== TaskStatus.Cancelled) {
          this.taskLifecycle.markTaskError(taskId, 'upload-failed');
          // Log the error or report it but don't re-throw it to allow the next folder to be processed
          errorService.reportError(castedError);
          continue;
        }
      } finally {
        unsubscribeCancelListener();
        unsubscribeUpdateListener();
      }
    }
  };
}
