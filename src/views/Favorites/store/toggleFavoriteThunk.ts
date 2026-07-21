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

interface ToggleFavoriteResult {
  partiallyFailed: boolean;
}

export const toggleFavoriteThunk = createAsyncThunk<ToggleFavoriteResult, DriveItemData[], { state: RootState }>(
  'storage/toggleFavorite',
  async (items: DriveItemData[], { dispatch, getState, rejectWithValue }) => {
    const results = await Promise.allSettled(items.map((item) => setItemFavorite(item, !item.isFavorite)));

    const rejected = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
    rejected.forEach((result) => errorService.reportError(result.reason));

    if (items.length > 0 && rejected.length === items.length) {
      throw rejectWithValue(errorService.castError(rejected[0].reason));
    }

    const unfavoritedItems: DriveItemData[] = [];

    items
      .filter((_, index) => results[index].status === 'fulfilled')
      .forEach((item) => {
        const favorite = !item.isFavorite;

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
      });

    if (unfavoritedItems.length > 0 && navigationService.isCurrentPath('favorites')) {
      const { selectedItems } = getState().storage;
      const itemsToDeselect = unfavoritedItems.filter((item) =>
        selectedItems.some((selected) => selected.id === item.id && selected.isFolder === item.isFolder),
      );

      if (itemsToDeselect.length > 0) {
        dispatch(storageActions.deselectItems(itemsToDeselect));
      }
    }

    return { partiallyFailed: rejected.length > 0 };
  },
);

export const toggleFavoriteThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(toggleFavoriteThunk.fulfilled, (_, action) => {
      if (action.payload.partiallyFailed) {
        notificationsService.show({ text: t('error.togglingSomeFavorites'), type: ToastType.Error });
      }
    })
    .addCase(toggleFavoriteThunk.rejected, () => {
      notificationsService.show({ text: t('error.togglingFavorite'), type: ToastType.Error });
    });
};
