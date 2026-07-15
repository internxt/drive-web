import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { t } from 'i18next';
import { StorageState } from 'app/store/slices/storage/storage.model';
import { storageActions } from 'app/store/slices/storage';
import { RootState } from 'app/store';
import navigationService from 'services/navigation.service';
import errorService from 'services/error.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { DriveItemData } from 'app/drive/types';
import { setItemFavorite } from '../services';

export const toggleFavoriteThunk = createAsyncThunk<void, DriveItemData[], { state: RootState }>(
  'storage/toggleFavorite',
  async (items: DriveItemData[], { dispatch, getState, rejectWithValue }) => {
    try {
      const unfavoritedItems: DriveItemData[] = [];

      await Promise.all(
        items.map(async (item) => {
          const favorite = !item.isFavorite;

          await setItemFavorite(item, favorite);

          dispatch(
            storageActions.patchItem({
              uuid: item.uuid,
              folderId: item.isFolder ? item.parentUuid : item.folderUuid,
              isFolder: item.isFolder,
              patch: { isFavorite: favorite },
            }),
          );

          if (favorite) {
            dispatch(storageActions.addFavorites([{ ...item, isFavorite: favorite }]));
          } else {
            dispatch(storageActions.removeFavorites([item]));
            unfavoritedItems.push(item);
          }
        }),
      );

      if (unfavoritedItems.length > 0 && navigationService.isCurrentPath('favorites')) {
        const { selectedItems } = getState().storage;
        const itemsToDeselect = unfavoritedItems.filter((item) =>
          selectedItems.some((selected) => selected.id === item.id && selected.isFolder === item.isFolder),
        );

        if (itemsToDeselect.length > 0) {
          dispatch(storageActions.deselectItems(itemsToDeselect));
        }
      }
    } catch (error) {
      errorService.reportError(error);
      const castedError = errorService.castError(error);
      throw rejectWithValue(castedError);
    }
  },
);

export const toggleFavoriteThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder.addCase(toggleFavoriteThunk.rejected, () => {
    notificationsService.show({ text: t('error.togglingFavorite'), type: ToastType.Error });
  });
};
