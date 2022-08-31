import { SdkFactory } from '../../app/core/factory/sdk';
import { storageActions } from '../../app/store/slices/storage';
import { store } from '../../app/store';
import { DriveItemData } from '../../app/drive/types';

const GetTrash = async () => {
  const trashClient = await SdkFactory.getInstance().createTrashClient();
  const itemsInTrash = await trashClient.getTrash();
  const items: DriveItemData[] = [
    ...(itemsInTrash.files as DriveItemData[]),
    ...(itemsInTrash.children as DriveItemData[]),
  ];
  items.forEach((item) => {
    item.isFolder = item.type == 'folder' || false;
    item.type = '';
  });
  store.dispatch(storageActions.clearSelectedItems());
  store.dispatch(storageActions.setItemsOnTrash(items));
};

export default GetTrash;
