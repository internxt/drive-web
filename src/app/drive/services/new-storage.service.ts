import {
  CheckDuplicatedFilesResponse,
  CheckDuplicatedFoldersResponse,
  DriveFileData,
  FileStructure,
  FolderAncestor,
  FolderMeta,
  FolderTreeResponse,
} from '@internxt/sdk/dist/drive/storage/types';
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

export async function getFolderMeta(uuid: string, workspaceId?: string, resourcesToken?: string): Promise<FolderMeta> {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  return storageClient.getFolderMeta(uuid, workspaceId, resourcesToken);
}

export async function getFolderTree(uuid: string): Promise<FolderTreeResponse> {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  return storageClient.getFolderTree(uuid);
}

export async function checkDuplicatedFiles(
  folderUuid: string,
  filesList: FileStructure[],
): Promise<CheckDuplicatedFilesResponse> {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  return storageClient.checkDuplicatedFiles({ folderUuid, filesList });
}

export async function checkDuplicatedFolders(
  folderUuid: string,
  folderNamesList: string[],
): Promise<CheckDuplicatedFoldersResponse> {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  return storageClient.checkDuplicatedFolders({ folderUuid, folderNamesList });
}

const newStorageService = {
  searchItemsByName,
  getFolderAncestors,
  getFolderMeta,
  getFolderTree,
  checkDuplicatedFiles,
  checkDuplicatedFolders,
};

export default newStorageService;
