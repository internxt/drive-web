import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { RootState } from '../../..';
import { DriveFileData, DriveFolderData, DriveItemData } from '../../../../models/interfaces';
import i18n from '../../../../services/i18n.service';
import notificationsService, { ToastType } from '../../../../services/notifications.service';
import storageThunks from '.';

export const downloadItemsThunk = createAsyncThunk<void, DriveItemData[], { state: RootState }>(
  'storage/downloadItems',
  async (items: DriveItemData[], { dispatch, requestId, rejectWithValue }) => {
    const promises: Promise<void>[] = [];
    const errors: unknown[] = [];

    for (const item of items) {
      if (item.isFolder) {
        const downloadFolderPromise = dispatch(
          storageThunks.downloadFolderThunk({
            folder: item as DriveFolderData,
            options: { relatedTaskId: requestId },
          }),
        ).unwrap();
        promises.push(downloadFolderPromise);
      } else {
        const downloadFilePromise = dispatch(
          storageThunks.downloadFileThunk({
            file: item as DriveFileData,
            options: { relatedTaskId: requestId },
          }),
        ).unwrap();
        promises.push(downloadFilePromise);
      }
    }

    await Promise.allSettled(promises);

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
