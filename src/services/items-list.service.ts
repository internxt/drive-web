import { OrderDirection } from '../models/enums';
import { DriveItemData } from '../models/interfaces';
import arrayService from './array.service';

const itemsListService = {
  pushItems: (itemsToPush: DriveItemData[], list: DriveItemData[]): DriveItemData[] => {
    const lastFolderIndex = list.filter((item) => item.isFolder).length;
    const listCopy = [...list];
    const folders = itemsToPush.filter((item) => item.isFolder);
    const files = itemsToPush.filter((item) => !item.isFolder);

    arrayService.insertAt(listCopy, lastFolderIndex, folders);
    listCopy.push(...files);

    return listCopy;
  },
  sort(list: DriveItemData[], by: 'name' | 'type' | 'updatedAt' | 'size', direction: OrderDirection) {
    const dirNumber = direction === OrderDirection.Desc ? 1 : -1;
    const sortFns: Record<string, (a: DriveItemData, b: DriveItemData) => number> = {
      name: (a, b) => (a.name.toLowerCase() < b.name.toLowerCase() ? 1 : -1) * dirNumber,
      type: (a, b) => (a.type < b.type ? 1 : -1) * dirNumber,
      updatedAt: (a, b) => (a.updatedAt < b.updatedAt ? 1 : -1) * dirNumber,
      size: (a, b) => (a.size < b.size ? 1 : -1) * dirNumber,
    };

    list.sort(sortFns[by]);
  },
};

export default itemsListService;
