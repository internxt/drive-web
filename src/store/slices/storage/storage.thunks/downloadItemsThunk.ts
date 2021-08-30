import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { RootState } from '../../..';
import { TaskType, TaskStatus } from '../../../../models/enums';
import { DriveItemData, NotificationData } from '../../../../models/interfaces';
import downloadService from '../../../../services/download.service';
import i18n from '../../../../services/i18n.service';
import notificationsService, { ToastType } from '../../../../services/notifications.service';
import { tasksActions } from '../../tasks';
import { sessionSelectors } from '../../session/session.selectors';
import errorService from '../../../../services/error.service';

export const downloadItemsThunk = createAsyncThunk<void, DriveItemData[], { state: RootState }>(
  'storage/downloadItems',
  async (items: DriveItemData[], { getState, dispatch, requestId, rejectWithValue }) => {
    const isTeam: boolean = sessionSelectors.isTeam(getState());
    const notificationsUuids: string[] = [];
    const errors: unknown[] = [];

    items.forEach((item, i) => {
      const uuid = `${requestId}-${i}`;
      const notification: NotificationData = {
        uuid,
        action: TaskType.DownloadFile,
        status: TaskStatus.Pending,
        name: item.name,
        type: item.type,
        isFolder: item.isFolder,
      };

      notificationsUuids.push(uuid);
      dispatch(tasksActions.addNotification(notification));
    });

    for (const [index, item] of items.entries()) {
      try {
        const updateProgressCallback = (progress: number) =>
          dispatch(
            tasksActions.updateNotification({
              uuid: notificationsUuids[index],
              merge: {
                status: TaskStatus.InProcess,
                progress,
              },
            }),
          );

        dispatch(
          tasksActions.updateNotification({
            uuid: notificationsUuids[index],
            merge: { status: TaskStatus.Decrypting },
          }),
        );

        await downloadService.downloadFile(item, isTeam, updateProgressCallback).then(() => {
          dispatch(
            tasksActions.updateNotification({
              uuid: notificationsUuids[index],
              merge: {
                status: TaskStatus.Success,
              },
            }),
          );
        });
      } catch (err: unknown) {
        const castedError = errorService.castError(err);

        dispatch(
          tasksActions.updateNotification({
            uuid: notificationsUuids[index],
            merge: {
              status: TaskStatus.Error,
            },
          }),
        );

        errors.push({ ...castedError });
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
