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

export async function getFolderMeta(uuid: string, workspaceId?: string): Promise<FolderMeta> {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  return storageClient.getFolderMeta(uuid, workspaceId);
}

const newStorageService = {
  searchItemsByName,
  getFolderAncestors,
  getFolderMeta,
};

export default newStorageService;
