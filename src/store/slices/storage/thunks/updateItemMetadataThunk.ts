import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { storageActions, StorageState } from '..';
import { RootState } from '../../..';
import notify, { ToastType } from '../../../../components/Notifications';
import { DriveFileMetadataPayload, DriveFolderMetadataPayload, DriveItemData } from '../../../../models/interfaces';
import fileService from '../../../../services/file.service';
import folderService from '../../../../services/folder.service';
import i18n from '../../../../services/i18n.service';
import { selectorIsTeam } from '../../team';

export const updateItemMetadataThunk = createAsyncThunk<void, { item: DriveItemData, metadata: DriveFileMetadataPayload | DriveFolderMetadataPayload }, { state: RootState }>(
  'storage/updateItemMetadata',
  async (payload: { item: DriveItemData, metadata: DriveFileMetadataPayload
     | DriveFolderMetadataPayload }, { getState, dispatch }) => {
    const isTeam: boolean = selectorIsTeam(getState());
    const { item, metadata } = payload;

    item.isFolder ?
      await folderService.updateMetaData(item.id, metadata, isTeam) :
      await fileService.updateMetaData(item.fileId, metadata, isTeam);

    dispatch(storageActions.patchItem({
      id: item.id,
      isFolder: item.isFolder,
      patch: {
        name: payload.metadata.metadata.itemName
      }
    }));
  });

export const updateItemMetadataThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(updateItemMetadataThunk.pending, (state, action) => { })
    .addCase(updateItemMetadataThunk.fulfilled, (state, action) => { })
    .addCase(updateItemMetadataThunk.rejected, (state, action) => {
      const errorMessage = (action.error?.message || '').includes('this name exists') ?
        i18n.get('error.fileAlreadyExists') :
        i18n.get('error.changingName');

      notify(errorMessage, ToastType.Error);
    });
};