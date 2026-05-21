import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { DriveFileData, DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import { DriveFolderData as DriveFolderDataItem, DriveItemData } from 'app/drive/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import tasksService from 'app/tasks/services/tasks.service';
import { RenameFileTask, RenameFolderTask, TaskStatus, TaskType } from 'app/tasks/types';
import { t } from 'i18next';
import storageThunks from '.';
import { storageActions } from '..';
import { RootState } from '../../..';
import { checkDuplicatedFiles } from '../fileUtils/checkDuplicatedFiles';
import { getFilesByBatchs } from '../fileUtils/getFilesByBatchs';
import { getUniqueFilename } from '../fileUtils/getUniqueFilename';
import { checkFolderDuplicated } from '../folderUtils/checkFolderDuplicated';
import { getUniqueFolderName } from '../folderUtils/getUniqueFolderName';
import { CollisionGroup, StorageState } from '../storage.model';
import { IRoot } from '../types';

export const getCollisionGroups = async (
  groups: { destinationUuid: string; items: DriveItemData[] }[],
): Promise<CollisionGroup[]> => {
  return Promise.all(
    groups.map(async ({ destinationUuid, items }) => {
      const files = items.filter((item) => !item.isFolder) as DriveFileData[];
      const folders = items.filter((item) => item.isFolder) as DriveFolderData[];

      const [filesResult, foldersResult] = await Promise.all([
        files.length > 0
          ? checkDuplicatedFiles(getFilesByBatchs(files).flat() as DriveFileData[], destinationUuid)
          : { filesWithDuplicates: [], duplicatedFilesResponse: [], filesWithoutDuplicates: files },
        folders.length > 0
          ? checkFolderDuplicated(getFilesByBatchs(folders).flat() as DriveFolderData[], destinationUuid)
          : { foldersWithDuplicates: [], duplicatedFoldersResponse: [], foldersWithoutDuplicates: folders },
      ]);

      const duplicatedItems = [
        ...(filesResult.filesWithDuplicates as DriveItemData[]),
        ...(foldersResult.foldersWithDuplicates as DriveItemData[]),
      ];
      const existingItems = [
        ...(filesResult.duplicatedFilesResponse as DriveItemData[]),
        ...(foldersResult.duplicatedFoldersResponse as DriveItemData[]),
      ];
      const unrepeatedItems = [
        ...(filesResult.filesWithoutDuplicates as DriveItemData[]),
        ...(foldersResult.foldersWithoutDuplicates as DriveItemData[]),
      ];

      return {
        destinationUuid,
        duplicatedItems,
        existingItems,
        unrepeatedItems,
      };
    }),
  );
};

export const handleRepeatedUploadingFiles = async (
  files: (DriveFileData | File)[],
  destinationFolderUuid: string,
): Promise<{
  repeatedItems: (DriveFileData | File)[];
  existingItems: DriveFileData[];
  unrepeatedItems: (DriveFileData | File)[];
}> => {
  const batchs = getFilesByBatchs(files);
  const results = await Promise.all(
    batchs.map((batch) => checkDuplicatedFiles(batch as (DriveFileData | File)[], destinationFolderUuid)),
  );

  return results.reduce(
    (acc, cur) => {
      acc.repeatedItems.push(...cur.filesWithDuplicates);
      acc.existingItems.push(...cur.duplicatedFilesResponse);
      acc.unrepeatedItems.push(...cur.filesWithoutDuplicates);
      return acc;
    },
    {
      repeatedItems: [] as (DriveFileData | File)[],
      existingItems: [] as DriveFileData[],
      unrepeatedItems: [] as (DriveFileData | File)[],
    },
  );
};

export const handleRepeatedUploadingFolders = async (
  folders: (DriveFolderData | IRoot)[],
  destinationFolderUuid: string,
): Promise<{
  repeatedItems: (DriveFolderData | IRoot)[];
  existingItems: DriveFolderData[];
  unrepeatedItems: (DriveFolderData | IRoot)[];
}> => {
  const batchs = getFilesByBatchs(folders as (IRoot | DriveFolderData)[]);
  const results = await Promise.all(
    batchs.map((batch) => checkFolderDuplicated(batch as (DriveFolderData | IRoot)[], destinationFolderUuid)),
  );

  return results.reduce(
    (acc, cur) => {
      acc.repeatedItems.push(...cur.foldersWithDuplicates);
      acc.existingItems.push(...cur.duplicatedFoldersResponse);
      acc.unrepeatedItems.push(...cur.foldersWithoutDuplicates);
      return acc;
    },
    {
      repeatedItems: [] as (DriveFolderData | IRoot)[],
      existingItems: [] as DriveFolderData[],
      unrepeatedItems: [] as (DriveFolderData | IRoot)[],
    },
  );
};

export interface RenameItemsPayload {
  items: DriveItemData[];
  destinationFolderId: string;
  onRenameSuccess?: (newItemName: DriveItemData) => void;
}

export const renameItemsThunk = createAsyncThunk<void, RenameItemsPayload, { state: RootState }>(
  'storage/renameItems',
  async ({ items, destinationFolderId, onRenameSuccess }: RenameItemsPayload, { dispatch }) => {
    const promises: Promise<any>[] = [];

    if (items.some((item) => item.isFolder && item.uuid === destinationFolderId)) {
      return void notificationsService.show({ text: t('error.movingItemInsideItself'), type: ToastType.Error });
    }

    for (const [index, item] of items.entries()) {
      let itemParsed: DriveItemData;

      if (item.isFolder) {
        const { duplicatedFoldersResponse } = await checkFolderDuplicated([item], destinationFolderId);

        const finalFolderName = await getUniqueFolderName(
          item.plainName ?? item.name,
          duplicatedFoldersResponse as DriveFolderDataItem[],
          destinationFolderId,
        );
        itemParsed = { ...item, name: finalFolderName, plain_name: finalFolderName };
      } else {
        const { duplicatedFilesResponse } = await checkDuplicatedFiles([item], destinationFolderId);

        const finalFilename = await getUniqueFilename(
          item.name,
          item.type,
          duplicatedFilesResponse,
          destinationFolderId,
        );
        itemParsed = { ...item, name: finalFilename, plain_name: finalFilename };
      }

      const taskId: string = itemParsed.isFolder
        ? tasksService.create<RenameFolderTask>({
            action: TaskType.RenameFolder,
            showNotification: true,
            folder: itemParsed,
            destinationFolderId,
            cancellable: true,
          })
        : tasksService.create<RenameFileTask>({
            action: TaskType.RenameFile,
            showNotification: true,
            file: itemParsed,
            destinationFolderId,
            cancellable: true,
          });

      promises.push(dispatch(storageThunks.updateItemMetadataThunk({ item, metadata: { itemName: itemParsed.name } })));

      promises[index]
        .then(async (result) => {
          if (!result.error) {
            tasksService.updateTask({ taskId, merge: { status: TaskStatus.Success } });
            setTimeout(() => onRenameSuccess?.(itemParsed), 1000);
          } else {
            tasksService.updateTask({ taskId, merge: { status: TaskStatus.Error } });
          }
        })
        .catch(() => {
          tasksService.updateTask({ taskId, merge: { status: TaskStatus.Error } });
        });
    }

    return Promise.all(promises).then(() => {
      dispatch(storageActions.clearSelectedItems());
    });
  },
);

export const renameItemsThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(renameItemsThunk.pending, () => undefined)
    .addCase(renameItemsThunk.fulfilled, () => undefined)
    .addCase(renameItemsThunk.rejected, (state, action) => {
      notificationsService.show({
        text: action.error.message || t('error.renamingItem'),
        type: ToastType.Error,
      });
    });
};
