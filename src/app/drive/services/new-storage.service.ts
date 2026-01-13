import {
  CheckDuplicatedFilesResponse,
  CheckDuplicatedFoldersResponse,
  FileStructure,
  FetchFolderContentResponse,
  FolderAncestor,
  FolderMeta,
  FolderAncestorWorkspace,
  FolderStatsResponse,
} from '@internxt/sdk/dist/drive/storage/types';
import { SdkFactory } from 'app/core/factory/sdk';
import { RequestCanceler } from '@internxt/sdk/dist/shared/http/types';
import { ItemType } from '@internxt/sdk/dist/workspaces/types';
import transformItemService from './item-transform.service';

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

export async function getFolderStats(uuid: string): Promise<FolderStatsResponse> {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  return storageClient.getFolderStats(uuid);
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
  const [responsePromise, canceler] = storageClient.getFolderContentByUuid({
    folderUuid,
    limit,
    offset,
    trash,
    workspacesToken,
  });

  const transformedPromise = responsePromise.then((response) => ({
    ...response,
    files: transformItemService.mapFileSizeToNumber(response.files),
  }));

  return [transformedPromise, canceler];
}

export function deleteFolderByUuid(folderId: string) {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  return storageClient.deleteFolderByUuid(folderId);
}

const newStorageService = {
  getFolderAncestors,
  getFolderAncestorsInWorkspace,
  getFolderMeta,
  getFolderStats,
  checkDuplicatedFiles,
  checkDuplicatedFolders,
  getFolderContentByUuid,
  deleteFolderByUuid,
  hasUploadedFiles,
};

export default newStorageService;
