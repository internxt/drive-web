import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { RootState } from '../../..';
import { TaskType, TaskStatus } from '../../../../models/enums';
import { NotificationData } from '../../../../models/interfaces';
import folderService from '../../../../services/folder.service';
import i18n from '../../../../services/i18n.service';
import notificationsService, { ToastType } from '../../../../services/notifications.service';
import { tasksActions } from '../../tasks';
import { uploadItemsThunk } from './uploadItemsThunk';

export interface IRoot {
  name: string;
  folderId: number | null;
  childrenFiles: File[],
  childrenFolders: IRoot[],
  fullPathEdited: string
}

interface CreateFolderTreeStructurePayload {
  root: IRoot,
  currentFolderId: number,
  options?: {
    withNotification?: boolean;
    onSuccess?: () => void;
  }
}

export const createFolderTreeStructureThunk = createAsyncThunk<void, CreateFolderTreeStructurePayload, { state: RootState }>(
  'storage/createFolderStructure',
  async ({ root, currentFolderId, options }, { getState, dispatch, requestId }) => {

    let alreadyUploaded = 0;
    const itemsUnderRoot = countItemsUnderRoot(root);

    const levels = [root];
    const notification: NotificationData = {
      uuid: requestId,
      action: TaskType.UploadFolder,
      status: TaskStatus.Pending,
      name: root.name,
      isFolder: true
    };

    options = Object.assign({ withNotification: true }, options || {});

    if (options?.withNotification) {
      dispatch(tasksActions.addNotification(notification));
    }

    try {
      root.folderId = currentFolderId;

      while (levels.length > 0) {
        const level: IRoot = levels.shift() as IRoot;
        const folderUploaded = await folderService.createFolder(level.folderId as number, level.name);

        if (level.childrenFiles){
          for (const childrenFile of level.childrenFiles){
            await dispatch(uploadItemsThunk({
              files: [childrenFile],
              parentFolderId: folderUploaded.id,
              folderPath: level.fullPathEdited,
              options: { withNotifications: false }
            }));

            dispatch(tasksActions.updateNotification({
              uuid: notification.uuid,
              merge: {
                status: TaskStatus.InProcess,
                progress: ++alreadyUploaded / itemsUnderRoot
              }
            }));

          }
        }

        for (const child of level.childrenFolders) {
          child.folderId = folderUploaded.id;
        }

        levels.push(...level.childrenFolders);
      }

      if (options?.withNotification) {
        dispatch(tasksActions.updateNotification({
          uuid: notification.uuid,
          merge: {
            status: TaskStatus.Success
          }
        }));
      }

      options.onSuccess?.();
    } catch (error) {
      options?.withNotification && dispatch(tasksActions.updateNotification({
        uuid: notification.uuid,
        merge: {
          status: TaskStatus.Error
        }
      }));

      throw error;
    }
  }
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

export const createFolderTreeStructureThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(createFolderTreeStructureThunk.pending, (state, action) => { })
    .addCase(createFolderTreeStructureThunk.fulfilled, (state, action) => { })
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