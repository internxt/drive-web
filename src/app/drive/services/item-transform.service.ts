import { DriveItemData } from '../types';

const showItemExtensionType = (item: DriveItemData) => {
  const type = item?.type;
  if (!type || type === 'folder') return '';
  return '.' + type;
};

const getItemPlainNameWithExtension = (item: DriveItemData) => {
  const plainName = item?.plainName ?? item?.plain_name;
  const type = item.type;

  if (!plainName || !type) return;
  else if (type === 'folder') return plainName;

  return plainName + '.' + type;
};

const transformItemService = {
  showItemExtensionType,
  getItemPlainNameWithExtension,
};

export default transformItemService;
