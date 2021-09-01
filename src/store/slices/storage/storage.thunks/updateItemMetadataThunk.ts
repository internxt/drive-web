import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { storageActions } from '..';
import { RootState } from '../../..';
import { DriveFileMetadataPayload, DriveFolderMetadataPayload, DriveItemData } from '../../../../models/interfaces';
import fileService from '../../../../services/file.service';
import folderService from '../../../../services/folder.service';
import i18n from '../../../../services/i18n.service';
import notificationsService, { ToastType } from '../../../../services/notifications.service';

export const updateItemMetadataThunk = createAsyncThunk<
  void,
  { item: DriveItemData; metadata: DriveFileMetadataPayload | DriveFolderMetadataPayload },
  { state: RootState }
>(
  'storage/updateItemMetadata',
  async (
    payload: { item: DriveItemData; metadata: DriveFileMetadataPayload | DriveFolderMetadataPayload },
    { dispatch },
  ) => {
    const { item, metadata } = payload;

    item.isFolder
      ? await folderService.updateMetaData(item.id, metadata)
      : await fileService.updateMetaData(item.fileId, metadata);

    dispatch(
      storageActions.patchItem({
        id: item.id,
        isFolder: item.isFolder,
        patch: {
          name: payload.metadata.metadata.itemName,
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
        ? i18n.get('error.fileAlreadyExists')
        : i18n.get('error.changingName');

      notificationsService.show(errorMessage, ToastType.Error);
    });
};
