import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';
import { items as itemUtils } from '@internxt/lib';

import i18n from '../../../../services/i18n.service';
import folderService from '../../../../services/folder.service';
import { renameFile } from '../../../../lib/utils';
import storageService from '../../../../services/storage.service';
import { TaskType, TaskStatus } from '../../../../models/enums';
import { DriveFileData, DriveItemData, NotificationData, UserSettings } from '../../../../models/interfaces';
import { tasksActions } from '../../tasks';
import { storageActions } from '..';
import { ItemToUpload } from '../../../../services/storage.service/storage-upload.service';
import { StorageState } from '../storage.model';
import { MAX_ALLOWED_UPLOAD_SIZE } from '../../../../lib/constants';
import { sessionSelectors } from '../../session/session.selectors';
import notificationsService, { ToastType } from '../../../../services/notifications.service';
import { RootState } from '../../..';
import errorService from '../../../../services/error.service';

interface UploadItemsPayload {
  files: File[];
  parentFolderId: number;
  folderPath: string;
  options?: {
    withNotifications?: boolean;
    onSuccess?: () => void;
  };
}

/**
 * @description
 *  1. Prepare files to upload
 *  2. Schedule tasks
 */
export const uploadItemsThunk = createAsyncThunk<void, UploadItemsPayload, { state: RootState }>(
  'storage/uploadItems',
  async ({ files, parentFolderId, folderPath, options }: UploadItemsPayload, { getState, dispatch, requestId }) => {
    const user = getState().user.user as UserSettings;
    const { namePath } = getState().storage;

    const showSizeWarning = files.some((file) => file.size >= MAX_ALLOWED_UPLOAD_SIZE);
    const isTeam: boolean = sessionSelectors.isTeam(getState());
    const relativePath = namePath
      .map((pathLevel) => pathLevel.name)
      .slice(1)
      .join('/');
    const filesToUpload: ItemToUpload[] = [];
    const uploadErrors: Error[] = [];
    const notificationsUuids: string[] = [];

    options = Object.assign({ withNotifications: true }, options || {});

    if (showSizeWarning) {
      notificationsService.show(
        'File too large.\nYou can only upload or download files of up to 1GB through the web app',
        ToastType.Warning,
      );
      return;
    }

    for (const [index, file] of files.entries()) {
      const { filename, extension } = itemUtils.getFilenameAndExt(file.name);
      const parentFolderContent = await folderService.fetchFolderContent(parentFolderId);
      const [, , finalFilename] = itemUtils.renameIfNeeded(parentFolderContent.files, filename, extension);
      const fileContent = renameFile(file, finalFilename);
      const notification: NotificationData = {
        uuid: `${requestId}-${index}`,
        action: TaskType.UploadFile,
        status: TaskStatus.Pending,
        name: finalFilename,
        isFolder: false,
        type: extension,
      };

      filesToUpload.push({
        name: finalFilename,
        size: file.size,
        type: extension,
        content: fileContent,
        parentFolderId,
        folderPath,
      });

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
          dispatch(
            tasksActions.updateNotification({
              uuid: notificationUuid,
              merge: {
                status: TaskStatus.InProcess,
                progress,
              },
            }),
          );
        }
      };
      const task = async (): Promise<DriveFileData> => {
        if (options?.withNotifications) {
          dispatch(
            tasksActions.updateNotification({
              uuid: notificationUuid,
              merge: {
                status: TaskStatus.Encrypting,
              },
            }),
          );
        }

        const uploadedFile = await storageService.upload.uploadItem(
          user.email,
          file,
          path,
          isTeam,
          updateProgressCallback,
        );

        uploadedFile.name = file.name;

        return uploadedFile;
      };

      file.parentFolderId = parentFolderId;

      await task()
        .then((uploadedFile) => {
          dispatch(storageActions.pushItems({ items: uploadedFile as DriveItemData }));

          if (options?.withNotifications) {
            dispatch(
              tasksActions.updateNotification({
                uuid: notificationUuid,
                merge: { status: TaskStatus.Success },
              }),
            );
          }
        })
        .catch((err: unknown) => {
          const castedError = errorService.castError(err);

          if (options?.withNotifications) {
            dispatch(
              tasksActions.updateNotification({
                uuid: notificationUuid,
                merge: { status: TaskStatus.Error },
              }),
            );
          }

          uploadErrors.push(castedError);
          console.error(castedError);
        });
    }

    options.onSuccess?.();

    if (uploadErrors.length > 0) {
      throw new Error('There were some errors during upload');
    }
  },
);

export const uploadItemsThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(uploadItemsThunk.pending, () => undefined)
    .addCase(uploadItemsThunk.fulfilled, () => undefined)
    .addCase(uploadItemsThunk.rejected, (state, action) => {
      notificationsService.show(
        i18n.get('error.uploadingFile', { reason: action.error.message || '' }),
        ToastType.Error,
      );
    });
};
