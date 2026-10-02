import { DriveItemData } from 'app/drive/types';

export type FavoriteToolbarAction = 'add' | 'remove' | null;

export const getFavoriteToolbarAction = (items: DriveItemData[]): FavoriteToolbarAction => {
  if (items.length === 0) {
    return null;
  }

  if (items.every((item) => item.isFavorite)) {
    return 'remove';
  }

  if (items.every((item) => !item.isFavorite)) {
    return 'add';
  }

  return null;
};
