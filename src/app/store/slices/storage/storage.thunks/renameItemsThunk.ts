import { ActionReducerMapBuilder, createAsyncThunk, Dispatch } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { storageActions } from '..';
import { RootState } from '../../..';
import { DriveItemData } from 'app/drive/types';
import { t } from 'i18next';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import storageSelectors from '../storage.selectors';
import { RenameFileTask, RenameFolderTask, TaskStatus, TaskType } from 'app/tasks/types';
import tasksService from 'app/tasks/services/tasks.service';
import renameFolderIfNeeded, { IRoot } from './uploadFolderThunk';
import { uiActions } from '../../ui';
import { SdkFactory } from '../../../../core/factory/sdk';
import renameIfNeeded from '@internxt/lib/dist/src/items/renameIfNeeded';
import storageThunks from '.';
import errorService from '../../../../core/services/error.service';

const checkRepeatedNameFiles = (destinationFolderFiles: DriveItemData[], files: (DriveItemData | File)[]) => {
  const repeatedFilesInDrive: DriveItemData[] = [];
  const unrepeatedFiles: (DriveItemData | File)[] = [];
  const filesRepeated = files.reduce((acc, file) => {
    const exists = destinationFolderFiles.some((folderFile) => {
      const fullFolderFileName = folderFile.name + '.' + folderFile.type;

      const fileName = (file as DriveItemData)?.fileId ? file.name + '.' + file.type : file.name;
      if (fullFolderFileName === fileName) {
        repeatedFilesInDrive.push(folderFile);
        return true;
      }
      return false;
    });

    if (exists) {
      return [...acc, file];
    }
    unrepeatedFiles.push(file);

    return acc;
  }, [] as (DriveItemData | File)[]);

  return { filesRepeated, repeatedFilesInDrive, unrepeatedFiles };
};

const checkRepeatedNameFolders = (destinationFolderFolders: DriveItemData[], folders: (DriveItemData | IRoot)[]) => {
  const repeatedFoldersInDrive: DriveItemData[] = [];
  const unrepeatedFolders: (DriveItemData | IRoot)[] = [];
  const foldersRepeated = folders.reduce((acc, file) => {
    const exists = destinationFolderFolders.some((folderFile) => {
      if (folderFile.name === file.name) {
        repeatedFoldersInDrive.push(folderFile);
        return true;
      }
      return false;
    });

    if (exists) {
      return [...acc, file];
    }
    unrepeatedFolders.push(file);

    return acc;
  }, [] as (DriveItemData | IRoot)[]);

  return { foldersRepeated, repeatedFoldersInDrive, unrepeatedFolders };
};

export const handleRepeatedUploadingFiles = (
  files: (DriveItemData | File)[],
  items: DriveItemData[],
  dispatch: Dispatch,
): (DriveItemData | File)[] => {
  const { filesRepeated, repeatedFilesInDrive, unrepeatedFiles } = checkRepeatedNameFiles(items, files);

  const hasRepeatedNameFiles = !!filesRepeated.length;
  if (hasRepeatedNameFiles) {
    dispatch(storageActions.setFilesToRename(filesRepeated));
    dispatch(storageActions.setDriveFilesToRename(repeatedFilesInDrive));
    dispatch(uiActions.setIsNameCollisionDialogOpen(true));
  }
  return unrepeatedFiles;
};

export const handleRepeatedUploadingFolders = (
  folders: (DriveItemData | IRoot)[],
  items: DriveItemData[],
  dispatch: Dispatch,
): (DriveItemData | IRoot)[] => {
  const { foldersRepeated, repeatedFoldersInDrive, unrepeatedFolders } = checkRepeatedNameFolders(items, folders);
  const hasRepeatedNameFiles = !!foldersRepeated.length;
  if (hasRepeatedNameFiles) {
    dispatch(storageActions.setFoldersToRename(foldersRepeated));
    dispatch(storageActions.setDriveFoldersToRename(repeatedFoldersInDrive));
    dispatch(uiActions.setIsNameCollisionDialogOpen(true));
  }
  return unrepeatedFolders;
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
      return void notificationsService.show({ text: t('error.movingItemInsideItself'), type: ToastType.Error });
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
