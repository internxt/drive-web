import { ActionReducerMapBuilder, AnyAction, ThunkDispatch, createAsyncThunk } from '@reduxjs/toolkit';

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
import workspacesSelectors from '../../workspaces/workspaces.selectors';

import { checkFolderDuplicated } from '../folderUtils/checkFolderDuplicated';
import { getUniqueFolderName } from '../folderUtils/getUniqueFolderName';
import { StorageState } from '../storage.model';
import { deleteItemsThunk } from './deleteItemsThunk';
import { uploadItemsParallelThunk } from './uploadItemsThunk';
import { IRoot } from '../types';

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
  const { duplicatedFoldersResponse } = await checkFolderDuplicated([root], currentFolderId);

  let finalFilename = root.name;
  if (duplicatedFoldersResponse.length > 0)
    finalFilename = await getUniqueFolderName(
      root.name,
      duplicatedFoldersResponse as DriveFolderData[],
      currentFolderId,
    );

  const folder: IRoot = { ...root, name: finalFilename };

  return folder;
};
const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

export const uploadFolderThunk = createAsyncThunk<void, UploadFolderThunkPayload, { state: RootState }>(
  'storage/createFolderStructure',
  async ({ root, currentFolderId, options }, { dispatch, requestId, getState }) => {
    const state = getState();
    const workspaceSelected = workspacesSelectors.getSelectedWorkspace(state);
    const memberId = workspaceSelected?.workspaceUser?.memberId;

    options = { withNotification: true, ...options };
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

        if (!rootFolderItem) {
          rootFolderItem = createdFolder;
        }

        if (!rootFolderData) {
          rootFolderData = createdFolder;
          tasksService.updateTask({
            taskId,
            merge: {
              stop: () => stopUploadTask(uploadFolderAbortController, dispatch, taskId, rootFolderItem),
            },
          });
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
        if (memberId) dispatch(planThunks.fetchBusinessLimitUsageThunk());
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
