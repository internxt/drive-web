import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { storageActions } from '..';
import { RootState } from '../../..';
import { StorageItemList } from '../../../../models/enums';
import { DriveItemData } from '../../../../models/interfaces';
import i18n from '../../../../services/i18n.service';
import notificationsService, { ToastType } from '../../../../services/notifications.service';
import storageService from '../../../../services/storage.service';
import { taskManagerActions } from '../../task-manager';
import {
  MoveFileTask,
  MoveFolderTask,
  TaskProgress,
  TaskStatus,
  TaskType,
} from '../../../../services/task-manager.service';

export interface MoveItemsPayload {
  items: DriveItemData[];
  destinationFolderId: number;
}

export const moveItemsThunk = createAsyncThunk<void, MoveItemsPayload, { state: RootState }>(
  'storage/moveItems',
  async (payload: MoveItemsPayload, { dispatch, requestId }) => {
    const { items, destinationFolderId } = payload;
    const promises: Promise<void>[] = [];

    if (items.some((item) => item.isFolder && item.id === destinationFolderId)) {
      return notificationsService.show(i18n.get('error.movingItemInsideItself'), ToastType.Error);
    }

    for (const [index, item] of items.entries()) {
      const task: MoveFileTask | MoveFolderTask = item.isFolder
        ? {
            id: `${requestId}-${index}`,
            action: TaskType.MoveFolder,
            status: TaskStatus.InProcess,
            progress: TaskProgress.Min,
            showNotification: true,
            folder: item,
            destinationFolderId,
            cancellable: false,
          }
        : {
            id: `${requestId}-${index}`,
            action: TaskType.MoveFile,
            status: TaskStatus.InProcess,
            progress: TaskProgress.Min,
            showNotification: true,
            file: item,
            destinationFolderId,
            cancellable: false,
          };

      dispatch(taskManagerActions.addTask(task));
      promises.push(storageService.moveItem(item, destinationFolderId));

      promises[index]
        .then(() => {
          dispatch(
            taskManagerActions.updateTask({
              taskId: task.id,
              merge: {
                status: TaskStatus.Success,
              },
            }),
          );

          dispatch(
            storageActions.popItems({
              lists: [StorageItemList.Drive],
              items: item,
            }),
          );
        })
        .catch(() => {
          dispatch(
            taskManagerActions.updateTask({
              taskId: task.id,
              merge: {
                status: TaskStatus.Error,
              },
            }),
          );
        });
    }

    return Promise.all(promises).then();
  },
);

export const moveItemsThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(moveItemsThunk.pending, () => undefined)
    .addCase(moveItemsThunk.fulfilled, () => undefined)
    .addCase(moveItemsThunk.rejected, () => {
      notificationsService.show(i18n.get('error.movingItem'), ToastType.Error);
    });
};
