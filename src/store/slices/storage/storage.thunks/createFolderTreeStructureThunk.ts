import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { RootState } from '../../..';
import folderService from '../../../../services/folder.service';
import i18n from '../../../../services/i18n.service';
import notificationsService, { ToastType } from '../../../../services/notifications.service';
import { taskManagerActions, taskManagerSelectors } from '../../task-manager';
import { uploadItemsThunk } from './uploadItemsThunk';
import errorService from '../../../../services/error.service';
import { TaskStatus, TaskType, UploadFolderTask } from '../../../../services/task-manager.service';
import { CancelTokenSource } from 'axios';
import { deleteItemsThunk } from './deleteItemsThunk';
import { DriveFolderData, DriveItemData } from '../../../../models/interfaces';

export interface IRoot {
  name: string;
  folderId: number | null;
  childrenFiles: File[];
  childrenFolders: IRoot[];
  fullPathEdited: string;
}

interface CreateFolderTreeStructurePayload {
  root: IRoot;
  currentFolderId: number;
  options?: {
    withNotification?: boolean;
    onSuccess?: () => void;
  };
}

export const createFolderTreeStructureThunk = createAsyncThunk<
  void,
  CreateFolderTreeStructurePayload,
  { state: RootState }
>('storage/createFolderStructure', async ({ root, currentFolderId, options }, { getState, dispatch, requestId }) => {
  options = Object.assign({ withNotification: true }, options || {});
  let alreadyUploaded = 0;
  let rootFolderItem: DriveFolderData | undefined;
  const levels = [root];
  const itemsUnderRoot = countItemsUnderRoot(root);
  const cancelTokenSources: CancelTokenSource[] = [];
  const task: UploadFolderTask = {
    id: requestId,
    action: TaskType.UploadFolder,
    status: TaskStatus.Pending,
    progress: 0,
    folderName: root.name,
    showNotification: !!options.withNotification,
    cancellable: true,
    stop: async () => {
      const uploadFileTasks = taskManagerSelectors.getTasks(getState())({ relatedTaskId: requestId });

      // Cancels folders creation
      for (const cancelTokenSource of cancelTokenSources) {
        cancelTokenSource.cancel();
      }

      // Cancels files upload
      for (const uploadFileTask of uploadFileTasks) {
        await uploadFileTask.stop?.();
      }

      // Deletes the root folder
      if (rootFolderItem) {
        await dispatch(deleteItemsThunk([rootFolderItem as DriveItemData]));
      }
    },
  };

  dispatch(taskManagerActions.addTask(task));

  try {
    root.folderId = currentFolderId;

    while (levels.length > 0) {
      const level: IRoot = levels.shift() as IRoot;
      const [folderUploadedPromise, cancelTokenSource] = folderService.createFolder(
        level.folderId as number,
        level.name,
      );

      cancelTokenSources.push(cancelTokenSource);

      const createdFolder = await folderUploadedPromise;
      rootFolderItem = {
        ...createdFolder,
        name: level.name,
        parent_id: createdFolder.parentId,
        user_id: createdFolder.userId,
        icon: null,
        iconId: null,
        icon_id: null,
        isFolder: true,
        color: null,
        encrypt_version: null,
      };

      if (level.childrenFiles) {
        for (const childrenFile of level.childrenFiles) {
          await dispatch(
            uploadItemsThunk({
              files: [childrenFile],
              parentFolderId: createdFolder.id,
              folderPath: level.fullPathEdited,
              options: { showNotifications: false },
            }),
          ).unwrap();

          dispatch(
            taskManagerActions.updateTask({
              taskId: task.id,
              merge: {
                status: TaskStatus.InProcess,
                progress: ++alreadyUploaded / itemsUnderRoot,
              },
            }),
          );
        }
      }

      for (const child of level.childrenFolders) {
        child.folderId = createdFolder.id;
      }

      levels.push(...level.childrenFolders);
    }

    dispatch(
      taskManagerActions.updateTask({
        taskId: task.id,
        merge: {
          status: TaskStatus.Success,
        },
      }),
    );

    options.onSuccess?.();
  } catch (err: unknown) {
    const castedError = errorService.castError(err);

    console.log('createFolderTreeStructureThunk catch: ', castedError);

    if (task.status !== TaskStatus.Cancelled) {
      dispatch(
        taskManagerActions.updateTask({
          taskId: task.id,
          merge: {
            status: TaskStatus.Error,
          },
        }),
      );
    }

    throw castedError;
  }
});

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

export const createFolderTreeStructureThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(createFolderTreeStructureThunk.pending, () => undefined)
    .addCase(createFolderTreeStructureThunk.fulfilled, () => undefined)
    .addCase(createFolderTreeStructureThunk.rejected, (state, action) => {
      let errorMessage = i18n.get('error.uploadingFolder');

      if (action.error.message?.includes('already exists')) {
        errorMessage = i18n.get('error.folderAlreadyExists');
      } else {
        errorMessage = action.error.message || action.error + '';
      }

      notificationsService.show(errorMessage, ToastType.Error);
    });
};
