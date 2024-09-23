import { ActionReducerMapBuilder, createAsyncThunk, Dispatch } from '@reduxjs/toolkit';

import { DriveFolderData, DriveItemData } from 'app/drive/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import tasksService from 'app/tasks/services/tasks.service';
import { RenameFileTask, RenameFolderTask, TaskStatus, TaskType } from 'app/tasks/types';
import { t } from 'i18next';
import storageThunks from '.';
import { storageActions } from '..';
import { RootState } from '../../..';
import errorService from '../../../../core/services/error.service';
import { uiActions } from '../../ui';
import { checkDuplicatedFiles } from '../fileUtils/checkDuplicatedFiles';
import { getUniqueFilename } from '../fileUtils/getUniqueFilename';
import { checkFolderDuplicated } from '../folderUtils/checkFolderDuplicated';
import { getUniqueFolderName } from '../folderUtils/getUniqueFolderName';
import { StorageState } from '../storage.model';
import { IRoot } from './uploadFolderThunk';

export const handleRepeatedUploadingFiles = async (
  files: (DriveItemData | File)[],
  dispatch: Dispatch,
  destinationFolderUuid: string,
): Promise<(DriveItemData | File)[]> => {
  const {
    filesWithDuplicates: filesRepeated,
    duplicatedFilesResponse,
    filesWithoutDuplicates: unrepeatedFiles,
  } = await checkDuplicatedFiles(files as File[], destinationFolderUuid);

  const hasRepeatedNameFiles = !!filesRepeated.length;
  if (hasRepeatedNameFiles) {
    dispatch(storageActions.setFilesToRename(filesRepeated as DriveItemData[]));
    dispatch(storageActions.setDriveFilesToRename(duplicatedFilesResponse as DriveItemData[]));
    dispatch(uiActions.setIsNameCollisionDialogOpen(true));
  }
  return unrepeatedFiles as DriveItemData[];
};

export const handleRepeatedUploadingFolders = async (
  folders: (DriveItemData | IRoot)[],
  dispatch: Dispatch,
  destinationFolderUuid: string,
): Promise<(DriveItemData | IRoot)[]> => {
  const {
    foldersWithDuplicates: foldersRepeated,
    duplicatedFoldersResponse,
    foldersWithoutDuplicates: unrepeatedFolders,
  } = await checkFolderDuplicated(folders, destinationFolderUuid);

  const hasRepeatedNameFiles = !!foldersRepeated.length;
  if (hasRepeatedNameFiles) {
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
  async ({ items, destinationFolderId, onRenameSuccess }: RenameItemsPayload, { getState, dispatch }) => {
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
          duplicatedFoldersResponse as DriveFolderData[],
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

      let taskId: string;
      if (itemParsed.isFolder) {
        taskId = tasksService.create<RenameFolderTask>({
          action: TaskType.RenameFolder,
          showNotification: true,
          folder: itemParsed,
          destinationFolderId,
          cancellable: true,
        });
      } else {
        taskId = tasksService.create<RenameFileTask>({
          action: TaskType.RenameFile,
          showNotification: true,
          file: itemParsed,
          destinationFolderId,
          cancellable: true,
        });
      }

      promises.push(dispatch(storageThunks.updateItemMetadataThunk({ item, metadata: { itemName: itemParsed.name } })));

      promises[index]
        .then(async () => {
          tasksService.updateTask({
            taskId,
            merge: {
              status: TaskStatus.Success,
            },
          });
          setTimeout(() => onRenameSuccess?.(itemParsed), 1000);
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
