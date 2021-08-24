import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { RootState } from '../../..';
import notify, { ToastType } from '../../../../components/Notifications';
import { TaskType, TaskStatus } from '../../../../models/enums';
import { NotificationData } from '../../../../models/interfaces';
import folderService from '../../../../services/folder.service';
import i18n from '../../../../services/i18n.service';
import { tasksActions } from '../../tasks';
import { uploadItemsThunk } from './uploadItemsThunk';

interface IRoot extends DirectoryEntry {
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
        const folderUploaded = await folderService.createFolder(level.folderId, level.name);

        await dispatch(uploadItemsThunk({
          files: level.childrenFiles || [],
          parentFolderId: folderUploaded.id,
          folderPath: level.fullPathEdited,
          options: { withNotifications: false }
        }));

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

      notify(errorMessage, ToastType.Error);
    });
};