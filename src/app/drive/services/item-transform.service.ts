import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';

const getItemPlainNameWithExtension = (item: {
  plainName?: string | null;
  plain_name?: string | null;
  type?: string | null;
}) => {
  const plainName = item?.plainName ?? item?.plain_name;
  const type = item.type;

  if (!plainName || !type) return;
  else if (type === 'folder') return plainName;

  return plainName + '.' + type;
};

const mapFileSize = (file: DriveFileData): DriveFileData => {
  return {
    ...file,
    size: Number(file.size),
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
