import { DriveItemData } from '../types';

const showItemExtensionType = (item: DriveItemData) => {
  const type = item?.type;
  if (!type || type === 'folder') return '';
  return '.' + type;
};

const transformItemService = {
  showItemExtensionType,
};

export default transformItemService;
