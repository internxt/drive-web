import { StorageTypes } from '@internxt/sdk/dist/drive';

import { SdkFactory } from 'app/core/factory/sdk';
import { DriveItemData } from 'app/drive/types';

export const setItemFavorite = (
  item: DriveItemData,
  favorite: boolean,
): Promise<StorageTypes.FavoriteStatusResponse> => {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  const itemType: StorageTypes.FavoriteItemType = item.isFolder ? 'folder' : 'file';

  return favorite
    ? storageClient.markItemAsFavorite(itemType, item.uuid)
    : storageClient.unmarkItemAsFavorite(itemType, item.uuid);
};
