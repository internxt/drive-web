import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { RootState } from '../../..';
import { uploadItemsParallelThunk, uploadItemsParallelThunkNoCheck } from './uploadItemsThunk';
import { deleteItemsThunk } from './deleteItemsThunk';
import storageThunks from '.';
import i18n from '../../../../i18n/services/i18n.service';
import tasksService from '../../../../tasks/services/tasks.service';
import errorService from '../../../../core/services/error.service';
import { TaskStatus, TaskType, UploadFolderTask } from '../../../../tasks/types';
import { DriveFolderData, DriveItemData } from '../../../../drive/types';
import notificationsService, { ToastType } from '../../../../notifications/services/notifications.service';
import analyticsService from 'app/analytics/services/analytics.service';

export interface IRoot {
  name: string;
  folderId: number | null;
  childrenFiles: File[];
  childrenFolders: IRoot[];
  fullPathEdited: string;
}

interface UploadFolderThunkPayload {
  root: IRoot;
  currentFolderId: number;
  options?: {
    withNotification?: boolean;
    onSuccess?: () => void;
  };
}

export const uploadFolderThunk = createAsyncThunk<void, UploadFolderThunkPayload, { state: RootState }>(
  'storage/createFolderStructure',
  async ({ root, currentFolderId, options }, { dispatch, requestId }) => {
    options = Object.assign({ withNotification: true }, options || {});

    let alreadyUploaded = 0;
    let rootFolderItem: DriveFolderData | undefined;
    const levels = [root];
    const itemsUnderRoot = countItemsUnderRoot(root);
    const taskId = tasksService.create<UploadFolderTask>({
      action: TaskType.UploadFolder,
      folderName: root.name,
      showNotification: !!options.withNotification,
      cancellable: true,
      stop: async () => {
        const relatedTasks = tasksService.getTasks({ relatedTaskId: requestId });
        const promises: Promise<void>[] = [];

        // Cancels related tasks
        promises.push(
          ...(relatedTasks.map((task) => task.stop?.()).filter((promise) => promise !== undefined) as Promise<void>[]),
        );

        // Deletes the root folder
        if (rootFolderItem) {
          promises.push(dispatch(deleteItemsThunk([rootFolderItem as DriveItemData])).unwrap());
        }

        await Promise.all(promises);
      },
    });

    try {
      root.folderId = currentFolderId;

      while (levels.length > 0) {
        const level: IRoot = levels.shift() as IRoot;
        const createdFolder = await dispatch(
          storageThunks.createFolderThunk({
            parentFolderId: level.folderId as number,
            folderName: level.name,
            options: { relatedTaskId: taskId, showErrors: false },
          }),
        ).unwrap();

        rootFolderItem = createdFolder;

        if (level.childrenFiles) {
          const concurrency = 6;
          const concurrentBytesLimit = 20 * 1024 * 1024;

          const uploadPacks: File[][] = [[]];
          let accumulatedBytes = 0;
          let currentPackFiles = 0;

          for (let i = 0, j = 0; i < level.childrenFiles.length; i++) {
            const concurrencyBytesLimitNotReached =
              accumulatedBytes + level.childrenFiles[i].size <= concurrentBytesLimit;
            const concurrencyLimitNotReached = currentPackFiles + 1 <= concurrency;

            if (concurrencyBytesLimitNotReached && concurrencyLimitNotReached) {
              uploadPacks[j].push(level.childrenFiles[i]);
            } else {
              accumulatedBytes = 0;
              currentPackFiles = 0;

              uploadPacks[++j] = [];
              uploadPacks[j].push(level.childrenFiles[i]);
            }
            currentPackFiles += 1;
            accumulatedBytes += level.childrenFiles[i].size;
          }

          for (const pack of uploadPacks) {
            await dispatch(
              uploadItemsParallelThunk({
                files: pack,
                parentFolderId: createdFolder.id,
                options: { relatedTaskId: taskId, showNotifications: false, showErrors: false },
              }),
            )
              .unwrap()
              .then(() => {
                alreadyUploaded += pack.length;

                tasksService.updateTask({
                  taskId: taskId,
                  merge: {
                    status: TaskStatus.InProcess,
                    progress: alreadyUploaded / itemsUnderRoot,
                  },
                });
              });
          }
        }

        for (const child of level.childrenFolders) {
          child.folderId = createdFolder.id;
        }

        levels.push(...level.childrenFolders);
      }

      tasksService.updateTask({
        taskId: taskId,
        merge: {
          status: TaskStatus.Success,
        },
      });

      options.onSuccess?.();
    } catch (err: unknown) {
      const castedError = errorService.castError(err);
      const updatedTask = tasksService.findTask(taskId);

      if (updatedTask?.status !== TaskStatus.Cancelled) {
        tasksService.updateTask({
          taskId: taskId,
          merge: {
            status: TaskStatus.Error,
          },
        });

        throw castedError;
      }
    }
  },
);

export const uploadFolderThunkNoCheck = createAsyncThunk<void, UploadFolderThunkPayload, { state: RootState }>(
  'storage/createFolderStructure',
  async ({ root, currentFolderId, options }, { dispatch, requestId }) => {
    options = Object.assign({ withNotification: true }, options || {});

    let alreadyUploaded = 0;
    let rootFolderItem: DriveFolderData | undefined;
    const levels = [root];
    const folderSize = getItemsSize(root);
    const itemsUnderRoot = countItemsUnderRoot(root);
    const taskId = tasksService.create<UploadFolderTask>({
      action: TaskType.UploadFolder,
      folderName: root.name,
      showNotification: !!options.withNotification,
      cancellable: true,
      stop: async () => {
        const relatedTasks = tasksService.getTasks({ relatedTaskId: requestId });
        const promises: Promise<void>[] = [];

        // Cancels related tasks
        promises.push(
          ...(relatedTasks.map((task) => task.stop?.()).filter((promise) => promise !== undefined) as Promise<void>[]),
        );

        // Deletes the root folder
        if (rootFolderItem) {
          promises.push(dispatch(deleteItemsThunk([rootFolderItem as DriveItemData])).unwrap());
        }

        await Promise.all(promises);
      },
    });

    try {
      root.folderId = currentFolderId;

      analyticsService.trackFolderUploadStarted(itemsUnderRoot, folderSize);

      while (levels.length > 0) {
        const level: IRoot = levels.shift() as IRoot;
        const createdFolder = await dispatch(
          storageThunks.createFolderThunk({
            parentFolderId: level.folderId as number,
            folderName: level.name,
            options: { relatedTaskId: taskId, showErrors: false },
          }),
        ).unwrap();

        rootFolderItem = createdFolder;

        if (level.childrenFiles) {
          const concurrency = 6;
          const concurrentBytesLimit = 20 * 1024 * 1024;

          const uploadPacks: File[][] = [[]];
          let accumulatedBytes = 0;
          let currentPackFiles = 0;

          for (let i = 0, j = 0; i < level.childrenFiles.length; i++) {
            const concurrencyBytesLimitNotReached =
              accumulatedBytes + level.childrenFiles[i].size <= concurrentBytesLimit;
            const concurrencyLimitNotReached = currentPackFiles + 1 <= concurrency;

            if (concurrencyBytesLimitNotReached && concurrencyLimitNotReached) {
              uploadPacks[j].push(level.childrenFiles[i]);
            } else {
              accumulatedBytes = 0;
              currentPackFiles = 0;

              uploadPacks[++j] = [];
              uploadPacks[j].push(level.childrenFiles[i]);
            }
            currentPackFiles += 1;
            accumulatedBytes += level.childrenFiles[i].size;
          }

          for (const pack of uploadPacks) {
            await dispatch(
              uploadItemsParallelThunkNoCheck({
                files: pack,
                parentFolderId: createdFolder.id,
                options: { relatedTaskId: taskId, showNotifications: false, showErrors: false },
              }),
            )
              .unwrap()
              .then(() => {
                alreadyUploaded += pack.length;

                tasksService.updateTask({
                  taskId: taskId,
                  merge: {
                    status: TaskStatus.InProcess,
                    progress: alreadyUploaded / itemsUnderRoot,
                  },
                });
              });
          }
        }

        for (const child of level.childrenFolders) {
          child.folderId = createdFolder.id;
        }

        levels.push(...level.childrenFolders);
      }

      tasksService.updateTask({
        taskId: taskId,
        merge: {
          status: TaskStatus.Success,
        },
      });

      options.onSuccess?.();
      analyticsService.trackFolderUploadCompleted(itemsUnderRoot, folderSize);
    } catch (err: any) {
      const castedError = errorService.castError(err);
      const updatedTask = tasksService.findTask(taskId);

      if (updatedTask?.status !== TaskStatus.Cancelled) {
        tasksService.updateTask({
          taskId: taskId,
          merge: {
            status: TaskStatus.Error,
          },
        });
        analyticsService.trackFolderUploadError(castedError.message, folderSize);
        throw castedError;
      }
    }
  },
);

function countItemsUnderRoot(root: IRoot): number {
  let count = 0;

  const queueOfFolders: Array<IRoot> = [root];

  while (queueOfFolders.length) {
    const folder = queueOfFolders.shift() as IRoot;

    count += folder.childrenFiles?.length ?? 0;

    queueOfFolders.push(...folder.childrenFolders);
  }

  return count;
}
function getItemsSize(root: IRoot): number {
  let size = 0;

  const queueOfFolders: Array<IRoot> = [root];

  while (queueOfFolders.length) {
    const folder = queueOfFolders.shift() as IRoot;

    folder.childrenFiles?.forEach((file) => (size += file.size));

    queueOfFolders.push(...folder.childrenFolders);
  }

  return size;
}

export const uploadFolderThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(uploadFolderThunk.pending, () => undefined)
    .addCase(uploadFolderThunk.fulfilled, () => undefined)
    .addCase(uploadFolderThunk.rejected, (state, action) => {
      let errorMessage = i18n.get('error.uploadingFolder');

      if (action.error.message?.includes('already exists')) {
        errorMessage = i18n.get('error.folderAlreadyExists');
      } else {
        errorMessage = action.error.message || action.error + '';
      }

      notificationsService.show({ text: errorMessage, type: ToastType.Error });
    });
};
