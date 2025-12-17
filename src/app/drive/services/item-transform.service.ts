import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import { DriveItemData } from '../types';

const getItemPlainNameWithExtension = (item: DriveItemData) => {
  const plainName = item?.plainName ?? item?.plain_name;
  const type = item.type;

  if (!plainName || !type) return;
  else if (type === 'folder') return plainName;

  return plainName + '.' + type;
};

const mapFileSize = (file: DriveFileData): DriveFileData => {
  return {
    ...file,
    size: typeof file.size === 'string' ? Number(file.size) : file.size,
  } as DriveFileData;
};

const mapFileSizeToNumber = (files: DriveFileData[]): DriveFileData[] => {
  return files.map(mapFileSize);
};

const transformItemService = {
  getItemPlainNameWithExtension,
  mapFileSizeToNumber,
};

export default transformItemService;
