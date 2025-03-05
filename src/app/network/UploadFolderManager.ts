import { TaskData, TaskEvent, TaskStatus, TaskType, UploadFolderTask } from '../tasks/types';
import { DriveFolderData, DriveItemData } from '../drive/types';
import { IRoot } from '../store/slices/storage/types';
import tasksService from '../tasks/services/tasks.service';
import errorService from '../core/services/error.service';
import { queue, QueueObject } from 'async';
import { t } from 'i18next';
import { AnyAction, ThunkDispatch } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { SdkFactory } from '../core/factory/sdk';
import { WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { planThunks } from '../store/slices/plan';
import { uploadItemsParallelThunk } from '../store/slices/storage/storage.thunks/uploadItemsThunk';
import { createFolder } from '../store/slices/storage/folderUtils/createFolder';
import { deleteItemsThunk } from '../store/slices/storage/storage.thunks/deleteItemsThunk';
import { checkFolderDuplicated } from '../store/slices/storage/folderUtils/checkFolderDuplicated';
import { getUniqueFolderName } from '../store/slices/storage/folderUtils/getUniqueFolderName';

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

const generateTaskIdForFolders = async (foldersPayload: UploadFolderPayload[]): Promise<TaskFolder[]> => {
  const taskFolders: TaskFolder[] = [];

  for (const folder of foldersPayload) {
    const { root: originalRoot, currentFolderId, options: payloadOptions } = folder;
    const options = { withNotification: true, ...payloadOptions };
    const root = await handleFoldersRename(originalRoot, currentFolderId);

    const uploadFolderAbortController = new AbortController();

    let taskId = options?.taskId;

    if (taskId) {
      tasksService.updateTask({
        taskId,
        merge: {
          folderName: root.name,
          status: TaskStatus.InProcess,
          progress: 0,
        },
      });
    } else {
      taskId = tasksService.create<UploadFolderTask>({
        action: TaskType.UploadFolder,
        folderName: root.name,
        item: root,
        parentFolderId: currentFolderId,
        showNotification: !!options.withNotification,
        cancellable: true,
      });
    }

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

const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const uploadFoldersWithManager = ({
  payload,
  selectedWorkspace,
  dispatch,
}: {
  payload: UploadFolderPayload[];
  selectedWorkspace: WorkspaceData | null;
  dispatch: ThunkDispatch<RootState, unknown, AnyAction>;
}): Promise<void> => {
  const uploadFoldersManager = new UploadFoldersManager(payload, selectedWorkspace, dispatch);
  return uploadFoldersManager.run();
};

export class UploadFoldersManager {
  private static readonly MAX_CONCURRENT_UPLOADS = 6;
  private static readonly MAX_UPLOAD_ATTEMPTS = 2;

  private readonly payload: UploadFolderPayload[];
  private readonly selectedWorkspace: WorkspaceData | null;
  private readonly dispatch: ThunkDispatch<RootState, unknown, AnyAction>;
  private readonly abortController?: AbortController;

  private tasksInfo: Record<string, TaskInfo> = {};

  constructor(
    payload: UploadFolderPayload[],
    selectedWorkspace: WorkspaceData | null,
    dispatch: ThunkDispatch<RootState, unknown, AnyAction>,
  ) {
    this.payload = payload;
    this.selectedWorkspace = selectedWorkspace;
    this.dispatch = dispatch;
  }

  private readonly uploadFoldersQueue: QueueObject<TaskFolder> = queue<TaskFolder>(
    (task, next: (err: Error | null, res?: DriveFolderData) => void) => {
      if (this.abortController?.signal.aborted) return;

      this.manageMemoryUsage();

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

  private readonly uploadFolderAsync = async (taskFolder: TaskFolder) => {
    const { root: level, currentFolderId, taskId, abortController } = taskFolder;

    if (abortController.signal.aborted) return;

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

    if (!createdFolder) {
      this.stopUploadTask(taskId, abortController);
      this.killQueueAndNotifyError(taskId);
      return;
    }

    if (!this.tasksInfo[taskId].rootFolderItem) {
      this.tasksInfo[taskId].rootFolderItem = createdFolder;
    }

    this.tasksInfo[taskId].progress.itemsUploaded += 1;

    tasksService.updateTask({
      taskId,
      merge: {
        progress: this.tasksInfo[taskId].progress.itemsUploaded / this.tasksInfo[taskId].progress.totalItems,
        stop: () => this.stopUploadTask(taskId, abortController),
      },
    });

    if (level.childrenFiles.length > 0 || level.childrenFolders.length > 0) {
      // Added wait in order to allow enough time for the server to create the folder
      await wait(600);
    }

    if (level.childrenFiles.length > 0) {
      if (abortController.signal.aborted) return;
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
          },
          onFileUploadCallback: () => {
            this.tasksInfo[taskId].progress.itemsUploaded += 1;
            tasksService.updateTask({
              taskId,
              merge: {
                progress: this.tasksInfo[taskId].progress.itemsUploaded / this.tasksInfo[taskId].progress.totalItems,
                stop: () => this.stopUploadTask(taskId, abortController),
              },
            });
          },
        }),
      )
        .unwrap()
        .catch(() => {
          this.stopUploadTask(taskId, abortController);
          this.killQueueAndNotifyError(taskId);
          return;
        });
    }

    for (const child of level.childrenFolders) {
      if (abortController.signal.aborted) return;

      this.uploadFoldersQueue.push({
        root: { ...child, folderId: createdFolder.uuid },
        currentFolderId: taskFolder.currentFolderId,
        options: taskFolder.options,
        abortController: taskFolder.abortController,
        taskId: taskFolder.taskId,
      });
    }

    return createdFolder;
  };

  private readonly manageMemoryUsage = () => {
    if (window?.performance?.memory) {
      const memory = window.performance.memory;

      if (memory.jsHeapSizeLimit != null && memory.usedJSHeapSize != null) {
        const memoryUsagePercentage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

        const shouldIncreaseConcurrency = memoryUsagePercentage < 0.7;
        if (shouldIncreaseConcurrency) {
          const newConcurrency = Math.min(this.uploadFoldersQueue.concurrency + 1, 6);
          if (newConcurrency !== this.uploadFoldersQueue.concurrency) {
            console.warn(`Memory usage under 70%. Increasing folder upload concurrency to ${newConcurrency}`);
            this.uploadFoldersQueue.concurrency = newConcurrency;
          }
        }

        const shouldReduceConcurrency = memoryUsagePercentage >= 0.8 && this.uploadFoldersQueue.concurrency > 1;
        if (shouldReduceConcurrency) {
          console.warn('Memory usage reached 80%. Reducing folder upload concurrency.');
          this.uploadFoldersQueue.concurrency = 1;
        }
      }
    } else {
      console.warn('Memory usage control is not available');
    }
  };

  private readonly stopUploadTask = async (taskId: string, uploadFolderAbortController: AbortController) => {
    uploadFolderAbortController.abort();
    const relatedTasks = tasksService.getTasks({ relatedTaskId: taskId });
    const promises: Promise<void>[] = [];

    // Cancels related tasks
    promises.push(
      ...(relatedTasks.map((task) => task.stop?.()).filter((promise) => promise !== undefined) as Promise<void>[]),
    );
    // Deletes the root folder
    const rootFolderItem = this.tasksInfo[taskId].rootFolderItem;
    if (rootFolderItem) {
      promises.push(this.dispatch(deleteItemsThunk([rootFolderItem as DriveItemData])).unwrap());
      const storageClient = SdkFactory.getInstance().createStorageClient();
      promises.push(storageClient.deleteFolder(rootFolderItem.id) as Promise<void>);
    }
    await Promise.allSettled(promises);
  };

  private readonly killQueueAndNotifyError = (taskId: string) => {
    this.uploadFoldersQueue.kill();
    tasksService.updateTask({
      taskId: taskId,
      merge: {
        status: TaskStatus.Error,
        subtitle: t('tasks.subtitles.upload-failed') as string,
      },
    });
  };

  public readonly run = async (): Promise<void> => {
    const payloadWithTaskId = await generateTaskIdForFolders(this.payload);

    const memberId = this.selectedWorkspace?.workspaceUser?.memberId;

    for (const taskFolder of payloadWithTaskId) {
      const { root, currentFolderId, options: payloadOptions, taskId } = taskFolder;
      const options = { withNotification: true, ...payloadOptions };

      this.tasksInfo[taskId] = {
        progress: {
          itemsUploaded: 0,
          totalItems: countItemsUnderRoot(root),
        },
      };

      tasksService.updateTask({
        taskId,
        merge: {
          status: TaskStatus.InProcess,
          progress: 0,
        },
      });

      const cancelQueueListener = (task?: TaskData) => {
        const isCurrentTask = task && task.id === taskId;
        if (isCurrentTask && task.status === TaskStatus.Cancelled) {
          this.uploadFoldersQueue.kill();
        }
      };

      const updateQueueListener = (task?: TaskData) => {
        const isCurrentTask = task && task.id === taskId;
        if (isCurrentTask && task.status === TaskStatus.InProcess) {
          this.uploadFoldersQueue.resume();
        } else if (isCurrentTask && task.status === TaskStatus.Paused) {
          this.uploadFoldersQueue.pause();
        }
      };

      tasksService.addListener({ event: TaskEvent.TaskCancelled, listener: cancelQueueListener });
      tasksService.addListener({ event: TaskEvent.TaskUpdated, listener: updateQueueListener });

      try {
        root.folderId = currentFolderId;
        await this.uploadFoldersQueue.pushAsync(taskFolder);

        while (this.uploadFoldersQueue.running() > 0 || this.uploadFoldersQueue.length() > 0) {
          await this.uploadFoldersQueue.drain();
        }

        tasksService.updateTask({
          taskId: taskId,
          merge: {
            itemUUID: { rootFolderUUID: this.tasksInfo[taskId].rootFolderItem?.uuid },
            status: TaskStatus.Success,
          },
        });

        options.onSuccess?.();

        setTimeout(() => {
          this.dispatch(planThunks.fetchUsageThunk());
          if (memberId) this.dispatch(planThunks.fetchBusinessLimitUsageThunk());
        }, 1000);
      } catch (err: unknown) {
        const castedError = errorService.castError(err);
        const updatedTask = tasksService.findTask(taskId);

        if (updatedTask?.status !== TaskStatus.Cancelled && taskId === updatedTask?.id) {
          tasksService.updateTask({
            taskId: taskId,
            merge: {
              status: TaskStatus.Error,
              subtitle: t('tasks.subtitles.upload-failed') as string,
            },
          });
          // Log the error or report it but don't re-throw it to allow the next folder to be processed
          errorService.reportError(castedError);
          continue;
        }
      } finally {
        tasksService.removeListener({ event: TaskEvent.TaskCancelled, listener: cancelQueueListener });
        tasksService.removeListener({ event: TaskEvent.TaskUpdated, listener: updateQueueListener });
      }
    }
  };
}
