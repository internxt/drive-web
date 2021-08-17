import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '..';
import { RootState } from '../../..';
import notify, { ToastType } from '../../../../components/Notifications';
import { TaskType, TaskStatus } from '../../../../models/enums';
import { DriveItemData, NotificationData } from '../../../../models/interfaces';
import downloadService from '../../../../services/download.service';
import i18n from '../../../../services/i18n.service';
import { tasksActions } from '../../tasks';
import { selectorIsTeam } from '../../team';

export const downloadItemsThunk = createAsyncThunk<void, DriveItemData[], { state: RootState }>(
  'storage/downloadItems',
  async (items: DriveItemData[], { getState, dispatch, requestId, rejectWithValue }) => {
    const isTeam: boolean = selectorIsTeam(getState());
    const notificationsUuids: string[] = [];
    const errors: any[] = [];

    items.forEach((item, i) => {
      const uuid: string = `${requestId}-${i}`;
      const notification: NotificationData = {
        uuid,
        action: TaskType.DownloadFile,
        status: TaskStatus.Pending,
        name: item.name,
        type: item.type,
        isFolder: item.isFolder
      };

      notificationsUuids.push(uuid);
      dispatch(tasksActions.addNotification(notification));
    });

    for (const [index, item] of items.entries()) {
      try {
        const updateProgressCallback = (progress: number) => dispatch(tasksActions.updateNotification({
          uuid: notificationsUuids[index],
          merge: {
            status: TaskStatus.InProcess,
            progress
          }
        }));

        dispatch(tasksActions.updateNotification({
          uuid: notificationsUuids[index],
          merge: { status: TaskStatus.Decrypting }
        }));

        await downloadService.downloadFile(item, isTeam, updateProgressCallback).then(() => {
          dispatch(tasksActions.updateNotification({
            uuid: notificationsUuids[index],
            merge: {
              status: TaskStatus.Success
            }
          }));
        });
      } catch (error) {
        dispatch(tasksActions.updateNotification({
          uuid: notificationsUuids[index],
          merge: {
            status: TaskStatus.Error
          }
        }));

        errors.push({ ...error });
      }
    }

    if (errors.length > 0) {
      return rejectWithValue(errors);
    }
  });

export const downloadItemsThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(downloadItemsThunk.pending, (state, action) => { })
    .addCase(downloadItemsThunk.fulfilled, (state, action) => { })
    .addCase(downloadItemsThunk.rejected, (state, action: any) => {
      if (action.payload && action.payload.length > 0) {
        notify(i18n.get('error.downloadingItems'), ToastType.Error);
      } else {
        notify(
          i18n.get('error.downloadingFile', { reason: action.error.message || '' }),
          ToastType.Error
        );
      }
    });
};