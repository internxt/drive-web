import { SdkFactory } from '../../app/core/factory/sdk';
import { storageActions } from '../../app/store/slices/storage';
import { store } from '../../app/store';
import { DriveItemData } from '../../app/drive/types';

const GetTrash = async (): Promise<void> => {
  const trashClient = await SdkFactory.getNewApiInstance().createTrashClient();
  const itemsInTrash = await trashClient.getTrash();
  itemsInTrash.children.forEach((folder) => {
    Object.assign(folder, { isFolder: true });
  });
  const items: DriveItemData[] = [
    ...(itemsInTrash.files as DriveItemData[]),
    ...(itemsInTrash.children as DriveItemData[]),
  ];
  store.dispatch(storageActions.clearSelectedItems());
  store.dispatch(storageActions.setItemsOnTrash(items));
};

export default GetTrash;
