import { StorageTypes } from '@internxt/sdk/dist/drive';

import { SdkFactory } from 'app/core/factory/sdk';

export const fetchFavoriteFolders = (limit: number, offset: number): Promise<StorageTypes.FavoriteFolderDto[]> => {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();

  const [foldersPromise] = storageClient.getFavoriteFolders({ limit, offset });

  return foldersPromise;
};

export const fetchFavoriteFiles = (limit: number, offset: number): Promise<StorageTypes.FavoriteFileDto[]> => {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();

  const [filesPromise] = storageClient.getFavoriteFiles({ limit, offset });

  return filesPromise;
};
