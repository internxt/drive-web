import { DriveItemData } from '../types';

const getItemPlainNameWithExtension = (item: DriveItemData) => {
  const plainName = item?.plainName ?? item?.plain_name;
  const type = item.type;

  if (!plainName || !type) return;
  else if (type === 'folder') return plainName;

  return plainName + '.' + type;
};

const transformItemService = {
  getItemPlainNameWithExtension,
};

export default transformItemService;
