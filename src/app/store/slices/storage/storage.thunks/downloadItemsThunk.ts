import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import storageThunks from '.';
import { StorageState } from '../storage.model';
import { RootState } from '../../..';
import { DriveFileData, DriveFolderData, DriveItemData } from 'app/drive/types';
import i18n from 'app/i18n/services/i18n.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { DownloadFileTask, DownloadFolderTask, TaskType } from 'app/tasks/types';
import tasksService from 'app/tasks/services/tasks.service';

export const downloadItemsThunk = createAsyncThunk<void, DriveItemData[], { state: RootState }>(
  'storage/downloadItems',
  async (items: DriveItemData[], { dispatch, requestId, rejectWithValue }) => {
    const errors: unknown[] = [];
    const taskGroupId = requestId;
    const tasksIds: string[] = [];

    // * 1. Creates tasks
    for (const item of items) {
      if (item.isFolder) {
        const taskId = tasksService.create<DownloadFolderTask>({
          action: TaskType.DownloadFolder,
          relatedTaskId: taskGroupId,
          folder: item,
          compressionFormat: 'zip',
          showNotification: true,
          cancellable: true,
        });

        tasksIds.push(taskId);
      } else {
        const taskId = tasksService.create<DownloadFileTask>({
          action: TaskType.DownloadFile,
          file: item,
          showNotification: true,
          cancellable: true,
          relatedTaskId: taskGroupId,
        });

        tasksIds.push(taskId);
      }
    }

    // * 2. Executes tasks
    for (const [index, item] of items.entries()) {
      const taskId = tasksIds[index];

      if (item.isFolder) {
        await dispatch(
          storageThunks.downloadFolderThunk({
            folder: item as DriveFolderData,
            options: { taskId },
          }),
        );
      } else {
        await dispatch(
          storageThunks.downloadFileThunk({
            file: item as DriveFileData,
            options: { taskId },
          }),
        );
      }
    }

    if (errors.length > 0) {
      return rejectWithValue(errors);
    }
  },
);

export const downloadItemsThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(downloadItemsThunk.pending, () => undefined)
    .addCase(downloadItemsThunk.fulfilled, () => undefined)
    .addCase(downloadItemsThunk.rejected, (state, action) => {
      const errors = action.payload as unknown[];

      if (errors && errors.length > 0) {
        notificationsService.show(i18n.get('error.downloadingItems'), ToastType.Error);
      } else {
        notificationsService.show(
          i18n.get('error.downloadingFile', { reason: action.error.message || '' }),
          ToastType.Error,
        );
      }
    });
};
