import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { RootState } from '../../..';
import { uploadItemsParallelThunk, uploadItemsParallelThunkNoCheck } from './uploadItemsThunk';
import { deleteItemsThunk } from './deleteItemsThunk';
import storageThunks from '.';
import tasksService from '../../../../tasks/services/tasks.service';
import errorService from '../../../../core/services/error.service';
import { TaskStatus, TaskType, UploadFolderTask } from '../../../../tasks/types';
import { DriveFolderData, DriveItemData } from '../../../../drive/types';
import notificationsService, { ToastType } from '../../../../notifications/services/notifications.service';
import { SdkFactory } from '../../../../core/factory/sdk';
import { t } from 'i18next';
import { planThunks } from '../../plan';

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

const handleFoldersRename = async (root: IRoot, currentFolderId: number) => {
  const storageClient = SdkFactory.getInstance().createStorageClient();
  const [parentFolderContentPromise] = storageClient.getFolderContent(currentFolderId);
  const parentFolderContent = await parentFolderContentPromise;
  const [, , finalFilename] = renameFolderIfNeeded(parentFolderContent.children, root.name);
  const fileContent: IRoot = { ...root, name: finalFilename };

  return fileContent;
};

export const uploadFolderThunk = createAsyncThunk<void, UploadFolderThunkPayload, { state: RootState }>(
  'storage/createFolderStructure',
  async ({ root, currentFolderId, options }, { dispatch, requestId }) => {
    options = Object.assign({ withNotification: true }, options || {});
    const uploadFolderAbortController = new AbortController();

    let alreadyUploaded = 0;
    let rootFolderItem: DriveFolderData | undefined;

    const renamedRoot = await handleFoldersRename(root, currentFolderId);
    const levels = [renamedRoot];

    const itemsUnderRoot = countItemsUnderRoot(renamedRoot);
    const taskId = tasksService.create<UploadFolderTask>({
      action: TaskType.UploadFolder,
      folderName: renamedRoot.name,
      showNotification: !!options.withNotification,
      cancellable: true,
      stop: async () => {
        uploadFolderAbortController.abort();
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
      renamedRoot.folderId = currentFolderId;
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
          await dispatch(
            uploadItemsParallelThunk({
              files: level.childrenFiles,
              parentFolderId: createdFolder.id,
              options: {
                relatedTaskId: taskId,
                showNotifications: false,
                showErrors: false,
                abortController: uploadFolderAbortController,
              },
              filesProgress: { filesUploaded: alreadyUploaded, totalFilesToUpload: itemsUnderRoot },
            }),
          )
            .unwrap()
            .then(() => {
              alreadyUploaded += level.childrenFiles.length;
              alreadyUploaded += 1;

              tasksService.updateTask({
                taskId: taskId,
                merge: {
                  status: TaskStatus.InProcess,
                  progress: alreadyUploaded / itemsUnderRoot,
                },
              });
            });
        }

        const childrenFolders = [] as IRoot[];
        for (const child of level.childrenFolders) {
          childrenFolders.push({ ...child, folderId: createdFolder.id });
        }

        levels.push(...childrenFolders);
      }

      tasksService.updateTask({
        taskId: taskId,
        merge: {
          status: TaskStatus.Success,
        },
      });

      options.onSuccess?.();
      setTimeout(() => {
        dispatch(planThunks.fetchUsageThunk());
      }, 1000);
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

// TODO: Move to SDK
export default function renameFolderIfNeeded(items: { name: string }[], folderName: string): [boolean, number, string] {
  const FOLDER_INCREMENT_REGEX = /( \([0-9]+\))$/i;
  const INCREMENT_INDEX_REGEX = /\(([^)]+)\)/;

  const cleanFilename = folderName.replace(FOLDER_INCREMENT_REGEX, '');

  const infoFoldernames: { name: string; cleanName: string; incrementIndex: number }[] = items
    .map((item) => {
      const cleanName = item.name.replace(FOLDER_INCREMENT_REGEX, '');
      const incrementString = item.name.match(FOLDER_INCREMENT_REGEX)?.pop()?.match(INCREMENT_INDEX_REGEX)?.pop();
      const incrementIndex = parseInt(incrementString || '0');

      return {
        name: item.name,
        cleanName,
        incrementIndex,
      };
    })
    .filter((item) => item.cleanName === cleanFilename)
    .sort((a, b) => b.incrementIndex - a.incrementIndex);

  const filenameExists = !!infoFoldernames.length;

  if (filenameExists) {
    const index = infoFoldernames[0].incrementIndex + 1;

    return [true, index, getNextNewName(cleanFilename, index)];
  } else {
    return [false, 0, folderName];
  }
}

function getNextNewName(filename: string, i: number): string {
  return `${filename} (${i})`;
}

export const uploadFolderThunkNoCheck = createAsyncThunk<void, UploadFolderThunkPayload, { state: RootState }>(
  'storage/createFolderStructure',
  async ({ root, currentFolderId, options }, { dispatch }) => {
    options = Object.assign({ withNotification: true }, options || {});

    const uploadFolderAbortController = new AbortController();
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
        uploadFolderAbortController.abort();
        const relatedTasks = tasksService.getTasks({ relatedTaskId: taskId });
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
      },
    });

    try {
      root.folderId = currentFolderId;

      while (levels.length > 0) {
        if (uploadFolderAbortController.signal.aborted) return;

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
          if (uploadFolderAbortController.signal.aborted) return;
          await dispatch(
            uploadItemsParallelThunkNoCheck({
              files: level.childrenFiles,
              parentFolderId: createdFolder.id,
              options: {
                relatedTaskId: taskId,
                showNotifications: false,
                showErrors: false,
                abortController: uploadFolderAbortController,
              },
              filesProgress: { filesUploaded: alreadyUploaded, totalFilesToUpload: itemsUnderRoot },
            }),
          )
            .unwrap()
            .then(() => {
              alreadyUploaded += level.childrenFiles.length;
              alreadyUploaded += 1;
              if (uploadFolderAbortController.signal.aborted) return;
              tasksService.updateTask({
                taskId: taskId,
                merge: {
                  status: TaskStatus.InProcess,
                  progress: alreadyUploaded / itemsUnderRoot,
                },
              });
            });
        }

        const childrenFolders = [] as IRoot[];
        for (const child of level.childrenFolders) {
          childrenFolders.push({ ...child, folderId: createdFolder.id });
        }

        levels.push(...childrenFolders);
      }

      tasksService.updateTask({
        taskId: taskId,
        merge: {
          status: TaskStatus.Success,
        },
      });

      options.onSuccess?.();

      setTimeout(() => {
        dispatch(planThunks.fetchUsageThunk());
      }, 1000);
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

function countItemsUnderRoot(root: IRoot): number {
  let count = 0;

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
}

export const uploadFolderThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(uploadFolderThunk.pending, () => undefined)
    .addCase(uploadFolderThunk.fulfilled, () => undefined)
    .addCase(uploadFolderThunk.rejected, (state, action) => {
      let errorMessage = t('error.uploadingFolder');

      if (action.error.message?.includes('already exists')) {
        errorMessage = t('error.folderAlreadyExists');
      } else {
        errorMessage = action.error.message || action.error + '';
      }

      notificationsService.show({ text: errorMessage, type: ToastType.Error });
    });
};
