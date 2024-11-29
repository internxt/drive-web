import {
  CheckDuplicatedFilesResponse,
  CheckDuplicatedFoldersResponse,
  DriveFileData,
  FileStructure,
  FetchFolderContentResponse,
  FolderAncestor,
  FolderMeta,
  FolderTreeResponse,
} from '@internxt/sdk/dist/drive/storage/types';
import { SdkFactory } from '../../core/factory/sdk';
import { RequestCanceler } from '@internxt/sdk/dist/shared/http/types';

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

export function getFolderContentByUuid({
  folderUuid,
  limit,
  offset,
  trash,
  workspacesToken,
}: {
  folderUuid: string;
  limit?: number;
  offset?: number;
  trash?: boolean;
  workspacesToken?: string;
}): [Promise<FetchFolderContentResponse>, RequestCanceler] {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  return storageClient.getFolderContentByUuid({
    folderUuid,
    limit,
    offset,
    trash,
    workspacesToken,
  });
}

const newStorageService = {
  searchItemsByName,
  getFolderAncestors,
  getFolderMeta,
  getFolderTree,
  checkDuplicatedFiles,
  checkDuplicatedFolders,
  getFolderContentByUuid,
};

export default newStorageService;
