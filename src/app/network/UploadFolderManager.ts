import { TaskStatus, TaskType, UploadFolderTask } from '../tasks/types';
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

const MAX_CONCURRENT_UPLOADS = 6;

interface UploadFolderThunkPayload {
  root: IRoot;
  currentFolderId: string;
  options?: {
    taskId?: string;
    withNotification?: boolean;
    onSuccess?: () => void;
  };
}

interface TaskFolder {
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

const generateTaskIdForFolders = (foldersPayload: UploadFolderThunkPayload[]): TaskFolder[] => {
  return foldersPayload.map(({ root, currentFolderId, options: payloadOptions }) => {
    const options = { withNotification: true, ...payloadOptions };

    const uploadFolderAbortController = new AbortController();

    let taskId = options?.taskId;

    if (taskId) {
      tasksService.updateTask({
        taskId,
        merge: {
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

    return { root, currentFolderId, options: payloadOptions, taskId, abortController: uploadFolderAbortController };
  });
};

const stopUploadTask = async (
  uploadFolderAbortController: AbortController,
  dispatch: ThunkDispatch<RootState, unknown, AnyAction>,
  relatedTaskId?: string,
  rootFolderItem?: DriveFolderData,
) => {
  uploadFolderAbortController.abort();
  const relatedTasks = tasksService.getTasks({ relatedTaskId });
  const promises: Promise<void>[] = [];

  // Cancels related tasks
  promises.push(
    ...(relatedTasks.map((task) => task.stop?.()).filter((promise) => promise !== undefined) as Promise<void>[]),
  );
  // Deletes the root folder
  if (rootFolderItem) {
    promises.push(dispatch(deleteItemsThunk([rootFolderItem as DriveItemData])).unwrap());
    const storageClient = SdkFactory.getInstance().createStorageClient();
    promises.push(storageClient.deleteFolder(rootFolderItem.id) as Promise<void>);
  }
  await Promise.all(promises);
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

const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const uploadFoldersWithManager = ({
  payload,
  selectedWorkspace,
  dispatch,
}: {
  payload: UploadFolderThunkPayload[];
  selectedWorkspace: WorkspaceData | null;
  dispatch: ThunkDispatch<RootState, unknown, AnyAction>;
}): Promise<void> => {
  const uploadFoldersManager = new UploadFoldersManager(payload, selectedWorkspace, dispatch);
  return uploadFoldersManager.run();
};

class UploadFoldersManager {
  private readonly payload: UploadFolderThunkPayload[];
  private readonly selectedWorkspace: WorkspaceData | null;
  private readonly dispatch: ThunkDispatch<RootState, unknown, AnyAction>;
  private readonly abortController?: AbortController;

  private tasksInfo: Record<string, TaskInfo> = {};

  constructor(
    payload: UploadFolderThunkPayload[],
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
    MAX_CONCURRENT_UPLOADS,
  );

  private readonly uploadFolderAsync = async (taskFolder: TaskFolder) => {
    const { root: level, currentFolderId, taskId, abortController } = taskFolder;

    if (abortController.signal.aborted) return;

    const createdFolder = await createFolder(
      {
        parentFolderId: level.folderId as string,
        folderName: level.name,
        options: { relatedTaskId: taskId, showErrors: false },
      },
      currentFolderId,
      this.selectedWorkspace,
      { dispatch: this.dispatch },
    );

    if (!this.tasksInfo[taskId].rootFolderItem) {
      this.tasksInfo[taskId].rootFolderItem = createdFolder;
    }

    this.tasksInfo[taskId].progress.itemsUploaded += 1;

    tasksService.updateTask({
      taskId,
      merge: {
        progress: this.tasksInfo[taskId].progress.itemsUploaded / this.tasksInfo[taskId].progress.totalItems,
        stop: () => stopUploadTask(abortController, this.dispatch, taskId, this.tasksInfo[taskId].rootFolderItem),
      },
    });

    if (level.childrenFiles.length > 0 || level.childrenFolders.length > 0) {
      // Added wait in order to allow enough time for the server to create the folder
      await wait(500);
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
          },
        }),
      )
        .unwrap()
        .then(() => {
          this.tasksInfo[taskId].progress.itemsUploaded += level.childrenFiles.length;
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

      if (memory && memory?.jsHeapSizeLimit !== null && memory.usedJSHeapSize !== null) {
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

  public readonly run = async (): Promise<void> => {
    const payloadWithTaskId = generateTaskIdForFolders(this.payload);

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

      try {
        root.folderId = currentFolderId;
        this.uploadFoldersQueue.push(taskFolder);

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
      }
    }
  };
}
