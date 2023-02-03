import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { storageActions } from '..';
import { RootState } from '../../..';
import { DriveItemData } from 'app/drive/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import storageService from 'app/drive/services/storage.service';
import databaseService, { DatabaseCollection } from 'app/database/services/database.service';
import itemsListService from 'app/drive/services/items-list.service';
import storageSelectors from '../storage.selectors';
import { MoveFileTask, MoveFolderTask, TaskStatus, TaskType } from 'app/tasks/types';
import tasksService from 'app/tasks/services/tasks.service';
import { t } from 'i18next';

export interface MoveItemsPayload {
  items: DriveItemData[];
  destinationFolderId: number;
}

export const moveItemsThunk = createAsyncThunk<void, MoveItemsPayload, { state: RootState }>(
  'storage/moveItems',
  async (payload: MoveItemsPayload, { getState, dispatch }) => {
    const { items, destinationFolderId } = payload;
    const promises: Promise<void>[] = [];

    if (items.some((item) => item.isFolder && item.id === destinationFolderId)) {
      return void notificationsService.show({ text: t('error.movingItemInsideItself'), type: ToastType.Error });
    }

    for (const [index, item] of items.entries()) {
      const fromFolderId = item.parentId || item.folderId;
      let taskId: string;

      if (item.isFolder) {
        taskId = tasksService.create<MoveFolderTask>({
          action: TaskType.MoveFolder,
          showNotification: true,
          folder: item,
          destinationFolderId,
          cancellable: false,
        });
      } else {
        taskId = tasksService.create<MoveFileTask>({
          action: TaskType.MoveFile,
          showNotification: true,
          file: item,
          destinationFolderId,
          cancellable: false,
        });
      }

      promises.push(storageService.moveItem(item, destinationFolderId, storageSelectors.bucket(getState())));

      promises[index]
        .then(async () => {
          tasksService.updateTask({
            taskId,
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
            taskId,
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
      notificationsService.show({
        text: 'error',
        type: ToastType.Error,
      });
    });
};
