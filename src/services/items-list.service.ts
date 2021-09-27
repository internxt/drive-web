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
};

export default itemsListService;
