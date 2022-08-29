import { SdkFactory } from '../../app/core/factory/sdk';

const MoveItemsToTrash = async (itemsToTrash) => {
  const items = itemsToTrash.map((item) => {
    return {
      id: item.isFolder ? item.id : item.fileId,
      type: item.isFolder ? 'folder' : 'file',
    };
  });
  const storageClient = SdkFactory.getInstance().createStorageClient();
  await storageClient.addItemsToTrash({ items });
};

export default MoveItemsToTrash;
