import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import fileService from 'app/drive/services/file.service';
import folderService from 'app/drive/services/folder.service';
import { DriveFileMetadataPayload, DriveFolderMetadataPayload, DriveItemData } from 'app/drive/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { t } from 'i18next';
import { storageActions } from '..';
import { RootState } from '../../..';
import { StorageState } from '../storage.model';

export const updateItemMetadataThunk = createAsyncThunk<
  void,
  { item: DriveItemData; metadata: DriveFileMetadataPayload | DriveFolderMetadataPayload; resourceToken?: string },
  { state: RootState }
>(
  'storage/updateItemMetadata',
  async (
    payload: {
      item: DriveItemData;
      metadata: DriveFileMetadataPayload | DriveFolderMetadataPayload;
      resourceToken?: string;
    },
    { dispatch, getState },
  ) => {
    const { item, metadata, resourceToken } = payload;
    const state = getState();
    const namePath = state.storage.namePath;
    const namePathDestinationArray = namePath.map((level) => level.name);
    namePathDestinationArray[0] = '';

    item.isFolder
      ? await folderService.updateMetaData(item.uuid, metadata, resourceToken)
      : await fileService.updateMetaData(item.uuid, metadata, resourceToken);

    dispatch(
      storageActions.patchItem({
        uuid: item.uuid,
        folderId: item.isFolder ? item.parentUuid : item.folderUuid,
        isFolder: item.isFolder,
        patch: {
          name: payload.metadata.itemName,
          plain_name: payload.metadata.itemName,
          plainName: payload.metadata.itemName,
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
