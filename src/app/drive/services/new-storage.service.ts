import { DriveFileData, FolderAncestor, FolderMeta, FolderTreeResponse } from '@internxt/sdk/dist/drive/storage/types';
import { SdkFactory } from '../../core/factory/sdk';

export async function searchItemsByName(name: string): Promise<DriveFileData[]> {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  const result = await storageClient.searchItemsByName(name);

  return result;
}

export async function getFolderAncestors(uuid: string, isShared = false): Promise<FolderAncestor[]> {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  return storageClient.getFolderAncestors(uuid, isShared);
}

export async function getFolderMeta(uuid: string, workspaceId?: string, resourcesToken?: string): Promise<FolderMeta> {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  return storageClient.getFolderMeta(uuid, workspaceId, resourcesToken);
}

export async function getFolderTree(uuid: string): Promise<FolderTreeResponse> {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  return storageClient.getFolderTree(uuid);
}

const newStorageService = {
  searchItemsByName,
  getFolderAncestors,
  getFolderMeta,
  getFolderTree,
};

export default newStorageService;
