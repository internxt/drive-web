import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { RootState } from '../../..';
import folderService from '../../../../services/folder.service';
import i18n from '../../../../services/i18n.service';
import notificationsService, { ToastType } from '../../../../services/notifications.service';
import { taskManagerActions } from '../../task-manager';
import { uploadItemsThunk } from './uploadItemsThunk';
import errorService from '../../../../services/error.service';
import { TaskStatus, TaskType, UploadFolderTask } from '../../../../services/task-manager.service';

interface IRoot extends DirectoryEntry {
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
>('storage/createFolderStructure', async ({ root, currentFolderId, options }, { dispatch, requestId }) => {
  options = Object.assign({ withNotification: true }, options || {});

  const levels = [root];
  const task: UploadFolderTask = {
    id: requestId,
    action: TaskType.UploadFolder,
    status: TaskStatus.Pending,
    progress: 0,
    folderName: root.name,
    showNotification: !!options.withNotification,
    cancellable: true,
  };
  let alreadyUploaded = 0;
  const itemsUnderRoot = countItemsUnderRoot(root);

  dispatch(taskManagerActions.addTask(task));

  try {
    root.folderId = currentFolderId;

    while (levels.length > 0) {
      const level: IRoot = levels.shift() as IRoot;
      const folderUploaded = await folderService.createFolder(level.folderId as number, level.name);

      if (level.childrenFiles) {
        for (const childrenFile of level.childrenFiles) {
          await dispatch(
            uploadItemsThunk({
              files: [childrenFile],
              parentFolderId: folderUploaded.id,
              folderPath: level.fullPathEdited,
              options: { withNotifications: false },
            }),
          );

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
        child.folderId = folderUploaded.id;
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
    dispatch(
      taskManagerActions.updateTask({
        taskId: task.id,
        merge: {
          status: TaskStatus.Error,
        },
      }),
    );

    throw errorService.castError(err);
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
