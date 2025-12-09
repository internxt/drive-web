import {
  CheckDuplicatedFilesResponse,
  CheckDuplicatedFoldersResponse,
  FileStructure,
  FetchFolderContentResponse,
  FolderAncestor,
  FolderMeta,
  FolderAncestorWorkspace,
} from '@internxt/sdk/dist/drive/storage/types';
import { SdkFactory } from 'app/core/factory/sdk';
import { RequestCanceler } from '@internxt/sdk/dist/shared/http/types';
import { ItemType } from '@internxt/sdk/dist/workspaces/types';

export async function hasUploadedFiles(): Promise<{ hasUploadedFiles: boolean }> {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  return storageClient.hasUploadedFiles();
}

export async function getFolderAncestors(uuid: string): Promise<FolderAncestor[]> {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  return storageClient.getFolderAncestors(uuid);
}

export async function getFolderAncestorsInWorkspace(
  workspaceId: string,
  itemType: ItemType,
  uuid: string,
  resourcesToken?: string,
): Promise<FolderAncestorWorkspace[]> {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  return storageClient.getFolderAncestorsInWorkspace(workspaceId, itemType, uuid, resourcesToken);
}

export async function getFolderMeta(uuid: string, workspaceId?: string, resourcesToken?: string): Promise<FolderMeta> {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  return storageClient.getFolderMeta(uuid, workspaceId, resourcesToken);
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

export function deleteFolderByUuid(folderId: string) {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  return storageClient.deleteFolderByUuid(folderId);
}

const newStorageService = {
  getFolderAncestors,
  getFolderAncestorsInWorkspace,
  getFolderMeta,
  checkDuplicatedFiles,
  checkDuplicatedFolders,
  getFolderContentByUuid,
  deleteFolderByUuid,
  hasUploadedFiles,
};

export default newStorageService;
