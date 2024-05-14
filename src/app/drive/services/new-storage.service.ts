import { DriveFileData, FolderAncestor, FolderMeta } from '@internxt/sdk/dist/drive/storage/types';
import { SdkFactory } from '../../core/factory/sdk';

export async function searchItemsByName(name: string): Promise<DriveFileData[]> {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  const result = await storageClient.searchItemsByName(name);

  return result;
}

export async function getFolderAncestors(uuid: string): Promise<FolderAncestor[]> {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  return storageClient.getFolderAncestors(uuid);
}

export async function getFolderMeta(uuid: string): Promise<FolderMeta> {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  return storageClient.getFolderMeta(uuid);
}
export async function checkSizeLimit(fileSize: number): Promise<void> {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  return storageClient.checkSizeLimit(fileSize);
}

const newStorageService = {
  searchItemsByName,
  getFolderAncestors,
  getFolderMeta,
  checkSizeLimit,
};

export default newStorageService;
