import { ActionReducerMapBuilder, createAsyncThunk, Dispatch } from '@reduxjs/toolkit';

import { DriveItemData } from 'app/drive/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import tasksService from 'app/tasks/services/tasks.service';
import { RenameFileTask, RenameFolderTask, TaskStatus, TaskType } from 'app/tasks/types';
import { t } from 'i18next';
import storageThunks from '.';
import { storageActions } from '..';
import { RootState } from '../../..';
import { SdkFactory } from '../../../../core/factory/sdk';
import errorService from '../../../../core/services/error.service';
import { uiActions } from '../../ui';
import workspacesSelectors from '../../workspaces/workspaces.selectors';
import { checkDuplicatedFiles } from '../fileNameUtils/checkDuplicatedFiles';
import { getUniqueFilename } from '../fileNameUtils/getUniqueFilename';
import { checkFolderDuplicated } from '../folderNameUtils/checkFolderDuplicated';
import renameFolderIfNeeded from '../folderNameUtils/renameFolderIfNeeded';
import { StorageState } from '../storage.model';
import storageSelectors from '../storage.selectors';
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
    const state = getState();
    const workspaceCredentials = workspacesSelectors.getWorkspaceCredentials(state);

    if (items.some((item) => item.isFolder && item.uuid === destinationFolderId)) {
      return void notificationsService.show({ text: t('error.movingItemInsideItself'), type: ToastType.Error });
    }

    const currentFolderItems = storageSelectors.currentFolderItems(state);

    for (const [index, item] of items.entries()) {
      let itemParsed: DriveItemData;

      const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();

      const [parentFolderContentPromise] = storageClient.getFolderContentByUuid(
        destinationFolderId,
        false,
        workspaceCredentials?.tokenHeader,
      );
      const parentFolderContent = await parentFolderContentPromise;

      if (item.isFolder) {
        const currentFolderFolders = currentFolderItems.filter((item) => item?.isFolder);
        const allFolderToCheckNames = [...parentFolderContent.children, ...currentFolderFolders];
        const [, , finalFilename] = renameFolderIfNeeded(allFolderToCheckNames, item.name);
        itemParsed = { ...item, name: finalFilename, plain_name: finalFilename };
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
