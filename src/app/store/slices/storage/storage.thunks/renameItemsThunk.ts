import { ActionReducerMapBuilder, createAsyncThunk, Dispatch } from '@reduxjs/toolkit';

import { DriveFileData, DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import { DriveFolderData as DriveFolderDataItem, DriveItemData } from 'app/drive/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import tasksService from 'app/tasks/services/tasks.service';
import { RenameFileTask, RenameFolderTask, TaskStatus, TaskType } from 'app/tasks/types';
import { t } from 'i18next';
import storageThunks from '.';
import { storageActions } from '..';
import { RootState } from '../../..';
import { uiActions } from '../../ui';
import { checkDuplicatedFiles } from '../fileUtils/checkDuplicatedFiles';
import { getFilesByBatchs } from '../fileUtils/getFilesByBatchs';
import { getUniqueFilename } from '../fileUtils/getUniqueFilename';
import { checkFolderDuplicated } from '../folderUtils/checkFolderDuplicated';
import { getUniqueFolderName } from '../folderUtils/getUniqueFolderName';
import { StorageState } from '../storage.model';
import { IRoot } from '../types';

export const handleRepeatedUploadingFiles = async (
  files: (DriveFileData | File)[],
  dispatch: Dispatch,
  destinationFolderUuid: string,
): Promise<(DriveFileData | File)[]> => {
  const batchs = getFilesByBatchs(files);
  const promises = batchs.map((batch) =>
    checkDuplicatedFiles(batch as (DriveFileData | File)[], destinationFolderUuid),
  );

  const duplicatedFiles = await Promise.all(promises);

  const combinedResults = duplicatedFiles.reduce<{
    filesWithDuplicates: (DriveFileData | File)[];
    duplicatedFilesResponse: DriveFileData[];
    filesWithoutDuplicates: (DriveFileData | File)[];
  }>(
    (acc, cur) => {
      acc.filesWithDuplicates = [...acc.filesWithDuplicates, ...cur.filesWithDuplicates];
      acc.duplicatedFilesResponse = [...acc.duplicatedFilesResponse, ...cur.duplicatedFilesResponse];
      acc.filesWithoutDuplicates = [...acc.filesWithoutDuplicates, ...cur.filesWithoutDuplicates];
      return acc;
    },
    {
      filesWithDuplicates: [],
      duplicatedFilesResponse: [],
      filesWithoutDuplicates: [],
    },
  );

  const {
    filesWithDuplicates: filesRepeated,
    duplicatedFilesResponse,
    filesWithoutDuplicates: unrepeatedFiles,
  } = combinedResults;

  const hasRepeatedNameFiles = !!filesRepeated.length;
  if (hasRepeatedNameFiles) {
    dispatch(storageActions.setFilesToRename(filesRepeated as DriveItemData[]));
    dispatch(storageActions.setDriveFilesToRename(duplicatedFilesResponse as DriveItemData[]));
    dispatch(uiActions.setIsNameCollisionDialogOpen(true));
  }
  return unrepeatedFiles as DriveItemData[];
};

export const handleRepeatedUploadingFolders = async (
  folders: (DriveFolderData | IRoot)[],
  dispatch: Dispatch,
  destinationFolderUuid: string,
): Promise<(DriveFolderData | IRoot)[]> => {
  const batchs = getFilesByBatchs(folders as (IRoot | DriveFolderData)[]);
  const promises = batchs.map((batch) =>
    checkFolderDuplicated(batch as (DriveFolderData | IRoot)[], destinationFolderUuid),
  );

  const duplicatedFolders = await Promise.all(promises);

  const combinedResults = duplicatedFolders.reduce<{
    foldersWithDuplicates: (DriveFolderData | IRoot)[];
    duplicatedFoldersResponse: DriveFolderData[];
    foldersWithoutDuplicates: (DriveFolderData | IRoot)[];
  }>(
    (acc, cur) => {
      acc.foldersWithDuplicates = [...acc.foldersWithDuplicates, ...cur.foldersWithDuplicates];
      acc.duplicatedFoldersResponse = [...acc.duplicatedFoldersResponse, ...cur.duplicatedFoldersResponse];
      acc.foldersWithoutDuplicates = [...acc.foldersWithoutDuplicates, ...cur.foldersWithoutDuplicates];
      return acc;
    },
    {
      foldersWithDuplicates: [],
      duplicatedFoldersResponse: [],
      foldersWithoutDuplicates: [],
    },
  );

  const {
    foldersWithDuplicates: foldersRepeated,
    duplicatedFoldersResponse,
    foldersWithoutDuplicates: unrepeatedFolders,
  } = combinedResults;

  const hasRepeatedNameFolders = !!foldersRepeated.length;
  if (hasRepeatedNameFolders) {
    dispatch(storageActions.setFoldersToRename(foldersRepeated as DriveItemData[]));
    dispatch(storageActions.setDriveFoldersToRename(duplicatedFoldersResponse as DriveItemData[]));
    dispatch(uiActions.setIsNameCollisionDialogOpen(true));
  }

  return unrepeatedFolders as DriveItemData[];
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
            tasksService.updateTask({
              taskId,
              merge: {
                status: TaskStatus.Success,
              },
            });
            setTimeout(() => onRenameSuccess?.(itemParsed), 1000);
          } else {
            tasksService.updateTask({
              taskId,
              merge: {
                status: TaskStatus.Error,
              },
            });
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
