import { ActionReducerMapBuilder, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { storageActions } from '..';
import { RootState } from '../../..';
import { DriveFileMetadataPayload, DriveFolderMetadataPayload, DriveItemData } from 'app/drive/types';
import i18n from 'app/i18n/services/i18n.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import storageService from 'app/drive/services/storage.service';
import databaseService, { DatabaseCollection } from 'app/database/services/database.service';
import itemsListService from 'app/drive/services/items-list.service';
import storageSelectors from '../storage.selectors';
import { RenameFileTask, RenameFolderTask, TaskStatus, TaskType } from 'app/tasks/types';
import tasksService from 'app/tasks/services/tasks.service';
import renameFolderIfNeeded, { IRoot } from './uploadFolderThunk';
import { uiActions } from '../../ui';
import { SdkFactory } from '../../../../core/factory/sdk';
import renameIfNeeded from '@internxt/lib/dist/src/items/renameIfNeeded';
import storageThunks from '.';

// ACORDARSE DE REVISAR ANYS ANTES DE ABRIR EL PR!
const checkRepeatedNameFiles = (folderFiles: DriveItemData[], filesToUpload: any[]) => {
  const repeatedFilesInDrive = [] as DriveItemData[];
  const unrepeatedUploadedFiles = [] as File[];
  const filesToUploadRepeated = filesToUpload.reduce((acc, file) => {
    const exists = folderFiles.some((folderFile) => {
      const fullFolderFileName = folderFile.name + '.' + folderFile.type;

      const fileName = file?.fileId ? file.name + '.' + file.type : file.name;
      if (fullFolderFileName === fileName) {
        repeatedFilesInDrive.push(folderFile);
        return true;
      }
      return false;
    });

    if (exists) {
      return [...acc, file];
    }
    unrepeatedUploadedFiles.push(file);

    return acc;
  }, [] as File[]);

  return { filesToUploadRepeated, repeatedFilesInDrive, unrepeatedUploadedFiles };
};

const checkRepeatedNameFolders = (folderFolders: any[], foldersToUpload: any[]) => {
  const repeatedFoldersInDrive: any[] = [];
  const unrepeatedUploadedFolders: any[] = [];
  const foldersToUploadRepeated = foldersToUpload.reduce((acc, file) => {
    const exists = folderFolders.some((folderFile) => {
      if (folderFile.name === file.name) {
        repeatedFoldersInDrive.push(folderFile);
        return true;
      }
      return false;
    });

    if (exists) {
      return [...acc, file];
    }
    unrepeatedUploadedFolders.push(file);

    return acc;
  }, [] as IRoot[]);

  return { foldersToUploadRepeated, repeatedFoldersInDrive, unrepeatedUploadedFolders };
};

//tipo driveItem o File
export const handleRepeatedUploadingFiles = (files: any[], items, dispatch) => {
  const { filesToUploadRepeated, repeatedFilesInDrive, unrepeatedUploadedFiles } = checkRepeatedNameFiles(items, files);

  const hasRepeatedNameFiles = !!filesToUploadRepeated.length;
  if (hasRepeatedNameFiles) {
    dispatch(storageActions.setFilesToRename(filesToUploadRepeated));
    dispatch(storageActions.setDriveFilesToRename(repeatedFilesInDrive));
    dispatch(uiActions.setIsRenameDialogOpen(true));
  }
  return unrepeatedUploadedFiles;
};

//tipo driveItem o IRoot
export const handleRepeatedUploadingFolders = (folders: any[], items, dispatch) => {
  const { foldersToUploadRepeated, repeatedFoldersInDrive, unrepeatedUploadedFolders } = checkRepeatedNameFolders(
    items,
    folders,
  );
  const hasRepeatedNameFiles = !!foldersToUploadRepeated.length;
  if (hasRepeatedNameFiles) {
    dispatch(storageActions.setFoldersToRename(foldersToUploadRepeated));
    dispatch(storageActions.setDriveFoldersToRename(repeatedFoldersInDrive));
    dispatch(uiActions.setIsRenameDialogOpen(true));
  }
  return unrepeatedUploadedFolders;
};

export interface RenameItemsPayload {
  items: DriveItemData[];
  destinationFolderId: number;
}

export const renameItemsThunk = createAsyncThunk<void, RenameItemsPayload, { state: RootState }>(
  'storage/renameItems',
  async ({ items, destinationFolderId }: RenameItemsPayload, { getState, dispatch }) => {
    const promises: Promise<any>[] = [];

    if (items.some((item) => item.isFolder && item.id === destinationFolderId)) {
      return void notificationsService.show({ text: i18n.get('error.movingItemInsideItself'), type: ToastType.Error });
    }
    const state = getState();
    const currentFolderItems = storageSelectors.currentFolderItems(state);

    for (const [index, item] of items.entries()) {
      let itemParsed;

      const storageClient = SdkFactory.getInstance().createStorageClient();
      const [parentFolderContentPromise] = storageClient.getFolderContent(destinationFolderId);
      const parentFolderContent = await parentFolderContentPromise;

      if (item.isFolder) {
        const currentFolderFolders = currentFolderItems.filter((item) => item?.isFolder);
        const allFolderToCheckNames = [...parentFolderContent.children, ...currentFolderFolders];
        const [, , finalFilename] = renameFolderIfNeeded(allFolderToCheckNames, item.name);
        itemParsed = { ...item, name: finalFilename, plain_name: finalFilename };
      } else {
        const currentFolderFiles = currentFolderItems.filter((item) => !item?.isFolder);
        const allFilesToCheckNames = [...parentFolderContent.files, ...currentFolderFiles];
        const [, , finalFilename] = renameIfNeeded(allFilesToCheckNames, item.name, item.type);
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
          // Updates destination folder content in local database
          //  const destinationLevelDatabaseContent = await databaseService.get(
          //    DatabaseCollection.Levels,
          //    destinationFolderId,
          //  );
          //  if (destinationLevelDatabaseContent) {
          //    databaseService.put(
          //      DatabaseCollection.Levels,
          //      destinationFolderId,
          //      itemsListService.pushItems(items, destinationLevelDatabaseContent), // renombrar estos items
          //    );
          //  }
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
        text: action.error.message || i18n.get('error.renamingItem'),
        type: ToastType.Error,
      });
    });
};
