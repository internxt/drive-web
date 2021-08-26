import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import i18n from '../../../../services/i18n.service';
import { selectorIsTeam } from '../../team';
import folderService from '../../../../services/folder.service';
import { getFilenameAndExt } from '../../../../lib/utils';
import storageService from '../../../../services/storage.service';
import { TaskType, TaskStatus } from '../../../../models/enums';
import { NotificationData } from '../../../../models/interfaces';
import { tasksActions } from '../../tasks';
import { StorageState } from '..';
import { MAX_ALLOWED_UPLOAD_SIZE } from '../../../../lib/constants';
import notificationsService, { ToastType } from '../../../../services/notifications.service';

interface UploadItemsPayload {
  files: File[];
  parentFolderId: number;
  folderPath: string;
  options?: {
    withNotifications?: boolean,
    onSuccess?: () => void
  }
}

/**
 * @description
 *  1. Prepare files to upload
 *  2. Schedule tasks
 */
export const uploadItemsThunk = createAsyncThunk(
  'storage/uploadItems',
  async ({ files, parentFolderId, folderPath, options }: UploadItemsPayload, { getState, dispatch, requestId }: any) => {
    const { user } = getState().user;
    const { namePath, items } = getState().storage;

    const showSizeWarning = files.some(file => file.size >= MAX_ALLOWED_UPLOAD_SIZE);
    const isTeam: boolean = selectorIsTeam(getState());
    const relativePath = namePath.map((pathLevel) => pathLevel.name).slice(1).join('/');
    const filesToUpload: any[] = [];
    const uploadErrors: any[] = [];
    const notificationsUuids: string[] = [];

    options = Object.assign({ withNotifications: true }, options || {});

    if (showSizeWarning) {
      notificationsService.show(
        'File too large.\nYou can only upload or download files of up to 1GB through the web app',
        ToastType.Warning
      );
      return;
    }

    for (const [index, file] of files.entries()) {
      const { filename, extension } = getFilenameAndExt(file.name);
      const parentFolderContent = await folderService.fetchFolderContent(parentFolderId, isTeam);
      const [filenameExist, filenameIndex, finalFilename] = storageService.name.checkFileNameExists(parentFolderContent.newCommanderFiles, filename, extension);
      const fileContent = file;
      const notification: NotificationData = {
        uuid: `${requestId}-${index}`,
        action: TaskType.UploadFile,
        status: TaskStatus.Pending,
        name: finalFilename,
        isFolder: false,
        type: extension
      };

      filesToUpload.push({ name: finalFilename, size: file.size, type: extension, isLoading: true, content: fileContent });

      if (options?.withNotifications) {
        dispatch(tasksActions.addNotification(notification));
      }
      notificationsUuids.push(notification.uuid);
    }

    // 2.
    for (const [index, file] of filesToUpload.entries()) {
      const type = file.type === undefined ? null : file.type;
      const path = relativePath + '/' + file.name + '.' + type;
      const notificationUuid = notificationsUuids[index];
      const updateProgressCallback = (progress) => {
        if (options?.withNotifications) {
          dispatch(tasksActions.updateNotification({
            uuid: notificationUuid,
            merge: {
              status: TaskStatus.InProcess,
              progress
            }
          }));
        }
      };
      const task = async () => {
        if (options?.withNotifications) {
          dispatch(tasksActions.updateNotification({
            uuid: notificationUuid,
            merge: {
              status: TaskStatus.Encrypting
            }
          }));
        }

        const { res, data } = await storageService.upload.uploadItem(user.email, file, path, isTeam, updateProgressCallback);

        if (res.status === 402) {
          throw new Error('Rate limited');
        }
      };

      file.parentFolderId = parentFolderId;
      file.file = file;
      file.folderPath = folderPath;

      await task()
        .then(() => {
          if (options?.withNotifications) {
            dispatch(tasksActions.updateNotification({
              uuid: notificationUuid,
              merge: { status: TaskStatus.Success }
            }));
          }
        })
        .catch(error => {
          if (options?.withNotifications) {
            dispatch(tasksActions.updateNotification({
              uuid: notificationUuid,
              merge: { status: TaskStatus.Error }
            }));
          }

          uploadErrors.push(error);
          console.error(error);
        });
    }

    options.onSuccess?.();

    if (uploadErrors.length > 0) {
      throw new Error('There were some errors during upload');
    }
  });

export const uploadItemsThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(uploadItemsThunk.pending, (state, action) => { })
    .addCase(uploadItemsThunk.fulfilled, (state, action) => { })
    .addCase(uploadItemsThunk.rejected, (state, action) => {
      notificationsService.show(
        i18n.get('error.uploadingFile', { reason: action.error.message || '' }),
        ToastType.Error
      );
    });
};