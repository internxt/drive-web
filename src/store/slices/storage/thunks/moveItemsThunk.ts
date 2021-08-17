import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { storageActions, StorageState } from '..';
import { RootState } from '../../..';
import notify, { ToastType } from '../../../../components/Notifications';
import { TaskStatus, TaskType } from '../../../../models/enums';
import { DriveItemData, NotificationData } from '../../../../models/interfaces';
import i18n from '../../../../services/i18n.service';
import storageService from '../../../../services/storage.service';
import { tasksActions } from '../../tasks';

export interface MoveItemsPayload {
  items: DriveItemData[];
  destinationFolderId: number;
}

export const moveItemsThunk = createAsyncThunk<void, MoveItemsPayload, { state: RootState }>(
  'storage/moveItems',
  async (payload: MoveItemsPayload, { getState, dispatch, requestId }) => {
    const { items, destinationFolderId } = payload;
    const promises: Promise<void>[] = [];

    if (items.some((item) => item.isFolder && item.id === destinationFolderId)) {
      return notify(i18n.get('error.movingItemInsideItself'), ToastType.Error);
    }

    for (const [index, item] of items.entries()) {
      const notification: NotificationData = {
        uuid: `${requestId}-${index}`,
        action: item.isFolder ? TaskType.MoveFolder : TaskType.MoveFile,
        status: TaskStatus.InProcess,
        name: item.name,
        isFolder: item.isFolder
      };

      dispatch(tasksActions.addNotification(notification));
      promises.push(storageService.moveItem(item, destinationFolderId));

      promises[index]
        .then(() => {
          dispatch(tasksActions.updateNotification({
            uuid: notification.uuid,
            merge: {
              status: TaskStatus.Success
            }
          }));

          // TODO: update locally
        })
        .catch(error => {
          dispatch(tasksActions.updateNotification({
            uuid: notification.uuid,
            merge: {
              status: TaskStatus.Error
            }
          }));
        });
    }

    return Promise.all(promises).then(() => { });
  }
);

export const moveItemsThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(moveItemsThunk.pending, (state, action) => { })
    .addCase(moveItemsThunk.fulfilled, (state, action) => { })
    .addCase(moveItemsThunk.rejected, (state, action) => {
      notify(i18n.get('error.movingItem', { name: 'TODO: filename' }), ToastType.Error);
    });
};