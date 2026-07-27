import { StorageTypes } from '@internxt/sdk/dist/drive';

import { SdkFactory } from 'app/core/factory/sdk';

export const fetchFavoriteFolders = (limit: number, offset: number): Promise<StorageTypes.FavoriteFolderDto[]> => {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();

  const [foldersPromise] = storageClient.getFavorites('folder', { limit, offset });

  return foldersPromise;
};

export const fetchFavoriteFiles = (limit: number, offset: number): Promise<StorageTypes.FavoriteFileDto[]> => {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();

  const [filesPromise] = storageClient.getFavorites('file', { limit, offset });

  return filesPromise;
};
