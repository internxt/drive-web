import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { storageActions } from '..';
import { RootState } from '../../..';
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
import databaseService, { DatabaseCollection } from '../../../../services/database.service';
import itemsListService from '../../../../services/items-list.service';
import storageSelectors from '../storage.selectors';

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
      return notificationsService.show(i18n.get('error.movingItemInsideItself'), ToastType.Error);
    }

    for (const [index, item] of items.entries()) {
      const fromFolderId = item.parentId || item.folderId;
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
      promises.push(storageService.moveItem(item, destinationFolderId, storageSelectors.bucket(getState())));

      promises[index]
        .then(async () => {
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
              folderIds: [fromFolderId],
              items: item,
            }),
          );

          // Updates destination folder content in local database
          const destinationLevelDatabaseContent = await databaseService.get(
            DatabaseCollection.Levels,
            destinationFolderId,
          );
          if (destinationLevelDatabaseContent) {
            databaseService.put(
              DatabaseCollection.Levels,
              destinationFolderId,
              itemsListService.pushItems(items, destinationLevelDatabaseContent),
            );
          }
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

    return Promise.all(promises).then(() => {
      dispatch(storageActions.clearSelectedItems());
    });
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
