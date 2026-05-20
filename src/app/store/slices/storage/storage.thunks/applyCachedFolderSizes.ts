import { DriveItemData } from 'app/drive/types';
import databaseService, { DatabaseCollection } from '../../../../database/services/database.service';

export const applyCachedFolderSizes = async (folderId: string, items: DriveItemData[]): Promise<DriveItemData[]> => {
  const cached = await databaseService.get(DatabaseCollection.Levels, folderId);
  const cachedSizeByUuid = new Map<string, number>();
  cached?.forEach((item) => {
    if (item.isFolder && item.uuid && item.sizeComputed === true && typeof item.size === 'number') {
      cachedSizeByUuid.set(item.uuid, item.size);
    }
  });

  return items.map((item) => {
    if (!item.isFolder) return item;

    const cachedSize = cachedSizeByUuid.get(item.uuid);
    if (cachedSize === undefined) return item;

    return { ...item, size: cachedSize, sizeComputed: true };
  });
};
