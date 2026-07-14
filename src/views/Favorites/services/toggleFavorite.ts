import { StorageTypes } from '@internxt/sdk/dist/drive';

import { SdkFactory } from 'app/core/factory/sdk';
import { DriveItemData } from 'app/drive/types';

export const setItemFavorite = (
  item: DriveItemData,
  favorite: boolean,
): Promise<StorageTypes.FavoriteStatusResponse> => {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();

  if (item.isFolder) {
    return favorite ? storageClient.markFolderAsFavorite(item.uuid) : storageClient.unmarkFolderAsFavorite(item.uuid);
  }

  return favorite ? storageClient.markFileAsFavorite(item.uuid) : storageClient.unmarkFileAsFavorite(item.uuid);
};
