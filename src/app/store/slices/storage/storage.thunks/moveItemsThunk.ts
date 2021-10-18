import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { storageActions } from '..';
import { RootState } from '../../..';
import { DriveItemData } from '../../../../drive/types';
import i18n from '../../../../i18n/services/i18n.service';
import notificationsService, { ToastType } from '../../../../notifications/services/notifications.service';
import storageService from '../../../../drive/services/storage.service';
import databaseService, { DatabaseCollection } from '../../../../database/services/database.service';
import itemsListService from '../../../../drive/services/items-list.service';
import storageSelectors from '../storage.selectors';
import { MoveFileTask, MoveFolderTask, TaskProgress, TaskStatus, TaskType } from '../../../../tasks/types';
import tasksService from '../../../../tasks/services/tasks.service';

export interface MoveItemsPayload {
  items: DriveItemData[];
  destinationFolderId: number;
  destinationPath: string;
}

export const moveItemsThunk = createAsyncThunk<void, MoveItemsPayload, { state: RootState }>(
  'storage/moveItems',
  async (payload: MoveItemsPayload, { getState, dispatch, requestId }) => {
    const { items, destinationFolderId, destinationPath } = payload;
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

      tasksService.addTask(task);
      promises.push(
        storageService.moveItem(item, destinationFolderId, destinationPath, storageSelectors.bucket(getState())),
      );

      promises[index]
        .then(async () => {
          tasksService.updateTask({
            taskId: task.id,
            merge: {
              status: TaskStatus.Success,
            },
          });

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
          tasksService.updateTask({
            taskId: task.id,
            merge: {
              status: TaskStatus.Error,
            },
          });
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
    .addCase(moveItemsThunk.rejected, (state, action) => {
      notificationsService.show(action.error.message || i18n.get('error.movingItem'), ToastType.Error);
    });
};
