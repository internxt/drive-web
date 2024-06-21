import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { t } from 'i18next';
import storageThunks from '.';
import { RootState } from '../../..';
import { SdkFactory } from '../../../../core/factory/sdk';
import errorService from '../../../../core/services/error.service';
import { DriveFolderData, DriveItemData } from '../../../../drive/types';
import notificationsService, { ToastType } from '../../../../notifications/services/notifications.service';
import tasksService from '../../../../tasks/services/tasks.service';
import { TaskStatus, TaskType, UploadFolderTask } from '../../../../tasks/types';
import { planThunks } from '../../plan';
import { StorageState } from '../storage.model';
import { deleteItemsThunk } from './deleteItemsThunk';
import { uploadItemsParallelThunk } from './uploadItemsThunk';

export interface IRoot {
  name: string;
  folderId: string | null;
  childrenFiles: File[];
  childrenFolders: IRoot[];
  fullPathEdited: string;
}

interface UploadFolderThunkPayload {
  root: IRoot;
  currentFolderId: string;
  options?: {
    taskId?: string;
    withNotification?: boolean;
    onSuccess?: () => void;
  };
}

const handleFoldersRename = async (root: IRoot, currentFolderId: string) => {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  const [parentFolderContentPromise] = storageClient.getFolderContentByUuid(currentFolderId);
  const parentFolderContent = await parentFolderContentPromise;
  const [, , finalFilename] = renameFolderIfNeeded(parentFolderContent.children, root.name);
  const fileContent: IRoot = { ...root, name: finalFilename };

  return fileContent;
};
const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const uploadFolderThunk = createAsyncThunk<void, UploadFolderThunkPayload, { state: RootState }>(
  'storage/createFolderStructure',
  async ({ root, currentFolderId, options }, { dispatch, requestId }) => {
    options = Object.assign({ withNotification: true }, options || {});
    const uploadFolderAbortController = new AbortController();

    let alreadyUploaded = 0;
    let rootFolderItem: DriveFolderData | undefined;
    let rootFolderData: DriveFolderData | undefined;

    const renamedRoot = await handleFoldersRename(root, currentFolderId);
    const levels = [renamedRoot];

    const itemsUnderRoot = countItemsUnderRoot(renamedRoot);

    let taskId = options?.taskId;
    const isRetriedUpload = !!taskId;

    if (isRetriedUpload && taskId) {
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
        folderName: renamedRoot.name,
        item: root,
        parentFolderId: currentFolderId,
        showNotification: !!options.withNotification,
        cancellable: true,
        stop: async () => {
          uploadFolderAbortController.abort();
          const relatedTasks = tasksService.getTasks({ relatedTaskId: requestId });
          const promises: Promise<void>[] = [];

          // Cancels related tasks
          promises.push(
            ...(relatedTasks
              .map((task) => task.stop?.())
              .filter((promise) => promise !== undefined) as Promise<void>[]),
          );

          // Deletes the root folder
          if (rootFolderItem) {
            promises.push(dispatch(deleteItemsThunk([rootFolderItem as DriveItemData])).unwrap());
          }

          await Promise.all(promises);
        },
      });
    }

    try {
      renamedRoot.folderId = currentFolderId;
      while (levels.length > 0) {
        const level: IRoot = levels.shift() as IRoot;
        const createdFolder = await dispatch(
          storageThunks.createFolderThunk({
            parentFolderId: level.folderId as string,
            folderName: level.name,
            options: { relatedTaskId: taskId, showErrors: false },
          }),
        ).unwrap();
        //Added wait in order to allow enough time for the server to create the folder
        await wait(500);

        rootFolderItem = createdFolder;
        if (!rootFolderData) {
          rootFolderData = createdFolder;
        }

        if (level.childrenFiles) {
          await dispatch(
            uploadItemsParallelThunk({
              files: level.childrenFiles,
              parentFolderId: createdFolder.uuid,
              options: {
                relatedTaskId: taskId,
                showNotifications: false,
                showErrors: false,
                abortController: uploadFolderAbortController,
                isRetriedUpload,
              },
              filesProgress: { filesUploaded: alreadyUploaded, totalFilesToUpload: itemsUnderRoot },
            }),
          )
            .unwrap()
            .then(() => {
              alreadyUploaded += level.childrenFiles.length;
              alreadyUploaded += 1;

              tasksService.updateTask({
                taskId: taskId as string,
                merge: {
                  progress: alreadyUploaded / itemsUnderRoot,
                },
              });
            });
        }

        const childrenFolders = [] as IRoot[];
        for (const child of level.childrenFolders) {
          childrenFolders.push({ ...child, folderId: createdFolder.uuid });
        }

        levels.push(...childrenFolders);
      }
      tasksService.isTaskProgressCompleted(taskId);

      tasksService.updateTask({
        taskId: taskId,
        merge: {
          status: TaskStatus.Success,
          itemUUID: { rootFolderUUID: rootFolderData?.uuid },
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
            subtitle: t('tasks.subtitles.upload-failed') as string,
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
    let rootFolderData: DriveFolderData | undefined;
    const levels = [root];
    const itemsUnderRoot = countItemsUnderRoot(root);

    let taskId = options?.taskId;

    if (taskId) {
      tasksService.updateTask({
        taskId,
        merge: {
          status: TaskStatus.InProcess,
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
        stop: async () => {
          uploadFolderAbortController.abort();
          const relatedTasks = tasksService.getTasks({ relatedTaskId: taskId });
          const promises: Promise<void>[] = [];

          // Cancels related tasks
          promises.push(
            ...(relatedTasks
              .map((task) => task.stop?.())
              .filter((promise) => promise !== undefined) as Promise<void>[]),
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
    }

    try {
      root.folderId = currentFolderId;

      while (levels.length > 0) {
        if (uploadFolderAbortController.signal.aborted) return;
        const level: IRoot = levels.shift() as IRoot;
        const createdFolder = await dispatch(
          storageThunks.createFolderThunk({
            parentFolderId: level.folderId as string,
            folderName: level.name,
            options: { relatedTaskId: taskId, showErrors: false },
          }),
        ).unwrap();
        //Added wait in order to allow enough time for the server to create the folder
        await wait(500);

        rootFolderItem = createdFolder;
        if (!rootFolderData) {
          rootFolderData = createdFolder;
        }

        if (level.childrenFiles) {
          if (uploadFolderAbortController.signal.aborted) return;
          await dispatch(
            uploadItemsParallelThunk({
              files: level.childrenFiles,
              parentFolderId: createdFolder.uuid,
              options: {
                relatedTaskId: taskId,
                showNotifications: false,
                showErrors: false,
                abortController: uploadFolderAbortController,
                disableDuplicatedNamesCheck: true,
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
                taskId: taskId as string,
                merge: {
                  progress: alreadyUploaded / itemsUnderRoot,
                },
              });
            });
        }

        const childrenFolders = [] as IRoot[];
        for (const child of level.childrenFolders) {
          childrenFolders.push({ ...child, folderId: createdFolder.uuid });
        }

        levels.push(...childrenFolders);
      }

      tasksService.updateTask({
        taskId: taskId,
        merge: {
          itemUUID: { rootFolderUUID: rootFolderData?.uuid },
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
            subtitle: t('tasks.subtitles.upload-failed') as string,
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
