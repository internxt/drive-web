import { DriveItemData } from 'app/drive/types';
import { AdvancedSharedItem } from 'app/share/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Role } from '@internxt/sdk/dist/drive/share/types';
import { MAX_SHARED_NAME_LENGTH } from 'views/Shared/SharedView';
import localStorageService from 'services/local-storage.service';

export const cropSharedName = (name: string) => {
  if (name.length > MAX_SHARED_NAME_LENGTH) {
    return name.substring(0, 32).concat('...');
  } else {
    return name;
  }
};

export const isAdvancedShareItem = (item: DriveItemData | AdvancedSharedItem): item is AdvancedSharedItem => {
  return item['encryptionKey'];
};

export const getLocalUserData = () => {
  const user = localStorageService.getUser() as UserSettings;
  const ownerData = {
    name: user.name,
    lastname: user.lastname,
    email: user.email,
    sharingId: '',
    avatar: user.avatar,
    uuid: user.uuid,
    role: {
      id: 'NONE',
      name: 'OWNER',
      createdAt: '',
      updatedAt: '',
    },
  };
  return ownerData;
};

export const filterEditorAndReader = (users: Role[]): Role[] => {
  return users.filter((user) => user.name === 'EDITOR' || user.name === 'READER');
};
