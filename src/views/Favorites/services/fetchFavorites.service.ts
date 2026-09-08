import { StorageTypes } from '@internxt/sdk/dist/drive';

import { SdkFactory } from 'app/core/factory/sdk';

export interface FavoritesSortOptions {
  sort: 'plainName' | 'updatedAt';
  order: 'ASC' | 'DESC';
}

export const fetchFavoriteFolders = (
  limit: number,
  offset: number,
  sortOptions?: FavoritesSortOptions,
): Promise<StorageTypes.FavoriteFolderDto[]> => {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();

  const [foldersPromise] = storageClient.getFavorites('folder', { limit, offset, ...sortOptions });

  return foldersPromise;
};

export const fetchFavoriteFiles = (
  limit: number,
  offset: number,
  sortOptions?: FavoritesSortOptions,
): Promise<StorageTypes.FavoriteFileDto[]> => {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();

  const [filesPromise] = storageClient.getFavorites('file', { limit, offset, ...sortOptions });

  return filesPromise;
};
