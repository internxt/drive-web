import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import databaseService, { DatabaseCollection } from 'app/database/services/database.service';
import itemsListService from 'app/drive/services/items-list.service';
import storageService from 'app/drive/services/storage.service';
import { DriveItemData } from 'app/drive/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import tasksService from 'app/tasks/services/tasks.service';
import { MoveFileTask, MoveFolderTask, TaskStatus, TaskType } from 'app/tasks/types';
import { t } from 'i18next';
import { storageActions } from '..';
import { RootState } from '../../..';
import errorService from '../../../../core/services/error.service';
import { StorageState } from '../storage.model';

export interface MoveItemsPayload {
  items: DriveItemData[];
  destinationFolderId: string;
}

export const moveItemsThunk = createAsyncThunk<void, MoveItemsPayload, { state: RootState }>(
  'storage/moveItems',
  async (payload: MoveItemsPayload, { dispatch }) => {
    const { items, destinationFolderId } = payload;
    const promises: Promise<void>[] = [];

    if (items.some((item) => item.isFolder && item.uuid === destinationFolderId)) {
      notificationsService.show({ text: t('error.movingItemInsideItself'), type: ToastType.Error });
      return;
    }

    for (const [index, item] of items.entries()) {
      const fromFolderId = item.folderUuid || item.parentUuid;
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

      promises.push(storageService.moveItem(item, destinationFolderId));

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

          dispatch(
            storageActions.pushItems({
              folderIds: [destinationFolderId],
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
        .catch((e) => {
          errorService.reportError(e);
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
    .addCase(moveItemsThunk.rejected, (_, action) => {
      notificationsService.show({
        text: action.error.message ?? t('error.movingItem'),
        type: ToastType.Error,
      });
    });
};
