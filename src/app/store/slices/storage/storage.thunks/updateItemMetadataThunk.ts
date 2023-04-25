import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { storageActions } from '..';
import { RootState } from '../../..';
import { DriveFileMetadataPayload, DriveFolderMetadataPayload, DriveItemData } from 'app/drive/types';
import fileService from 'app/drive/services/file.service';
import folderService from 'app/drive/services/folder.service';
import { t } from 'i18next';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import storageSelectors from '../storage.selectors';

export const updateItemMetadataThunk = createAsyncThunk<
  void,
  { item: DriveItemData; metadata: DriveFileMetadataPayload | DriveFolderMetadataPayload },
  { state: RootState }
>(
  'storage/updateItemMetadata',
  async (
    payload: { item: DriveItemData; metadata: DriveFileMetadataPayload | DriveFolderMetadataPayload },
    { dispatch, getState },
  ) => {
    const { item, metadata } = payload;
    const namePath = getState().storage.namePath;
    const namePathDestinationArray = namePath.map((level) => level.name);
    namePathDestinationArray[0] = '';

    item.isFolder
      ? await folderService.updateMetaData(item.id, metadata)
      : await fileService.updateMetaData(item.fileId, metadata, storageSelectors.bucket(getState()));

    dispatch(
      storageActions.patchItem({
        id: item.id,
        folderId: item.isFolder ? item.parentId : item.folderId,
        isFolder: item.isFolder,
        patch: {
          name: payload.metadata.itemName,
          plain_name: payload.metadata.itemName,
        },
      }),
    );
  },
);

export const updateItemMetadataThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(updateItemMetadataThunk.pending, () => undefined)
    .addCase(updateItemMetadataThunk.fulfilled, () => undefined)
    .addCase(updateItemMetadataThunk.rejected, (state, action) => {
      const errorMessage = (action.error?.message || '').includes('this name exists')
        ? t('error.fileAlreadyExists')
        : t('error.changingName');

      notificationsService.show({ text: errorMessage, type: ToastType.Error });
    });
};
