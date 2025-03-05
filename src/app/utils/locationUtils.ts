import { DriveItemData, DriveItemDetails } from './../drive/types/index';
import { getItemPlainName } from 'app/crypto/services/utils';

export function getSharedLocation(item: DriveItemDetails, ancestorPathNames: string[]): string {
  const baseLocation = 'Shared';
  if (ancestorPathNames.length === 0) {
    return baseLocation; // No ancestors then return 'Shared'
  }

  const path = item.isFolder
    ? ancestorPathNames.slice(0, -1).join('/') // Remove last folder if it's a folder
    : ancestorPathNames.join('/'); // Join all ancestor names if it's a file

  return `${baseLocation}/${path}`;
}

export function getRegularLocation(item: DriveItemDetails, ancestorPathNames: string[]): string {
  const pathNames = item.isFolder ? ancestorPathNames.slice(0, -1) : ancestorPathNames;
  return `${item.view}${pathNames.length > 0 ? '/' + pathNames.join('/') : ''}`;
}

export function getLocation(item: DriveItemDetails, ancestors: DriveItemData[]): string {
  const ancestorPathNames = ancestors.map(getItemPlainName).reverse().slice(1); // Remove root parent
  const itemViewName = item.view;

  let location = '/';

  if (itemViewName === 'Shared') {
    location += getSharedLocation(item, ancestorPathNames);
  } else {
    location += getRegularLocation(item, ancestorPathNames);
  }

  return location;
}
