import { DriveFolderData, DriveFolderMetadataPayload, DriveItemData, FolderTree } from '../types';
import errorService from '../../core/services/error.service';
import { aes } from '@internxt/lib';
import httpService from '../../core/services/http.service';
import { DevicePlatform } from '../../core/types';
import analyticsService from '../../analytics/services/analytics.service';
import i18n from '../../i18n/services/i18n.service';
import localStorageService from '../../core/services/local-storage.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { createStorageClient } from '../../../factory/modules';
import { StorageTypes } from '@internxt/sdk/dist/drive';
import { RequestCanceler } from '@internxt/sdk/dist/shared/http/types';

export interface IFolders {
  bucket: string;
  color: string;
  createdAt: Date;
  encrypt_version: string;
  icon: string;
  iconId: number | null;
  icon_id: number | null;
  id: number;
  name: string;
  parentId: number;
  parent_id: number;
  updatedAt: Date;
  userId: number;
  user_id: number;
}

export interface FolderChild {
  bucket: string;
  color: string;
  createdAt: string;
  encrypt_version: string;
  icon: string;
  iconId: number | null;
  icon_id: number | null;
  id: number;
  name: string;
  parentId: number;
  parent_id: number;
  updatedAt: string;
  userId: number;
  user_id: number;
}

export interface FetchFolderContentResponse {
  bucket: string;
  children: FolderChild[];
  color: string;
  createdAt: string;
  encrypt_version: string;
  files: DriveItemData[];
  icon: string;
  id: number;
  name: string;
  parentId: number;
  parent_id: number;
  updatedAt: string;
  userId: number;
  user_id: number;
}


export function createFolder(
  currentFolderId: number,
  folderName: string,
): [
  Promise<StorageTypes.CreateFolderResponse>,
  RequestCanceler
] {
  const payload: StorageTypes.CreateFolderPayload = {
    parentFolderId: currentFolderId,
    folderName: folderName
  };
  const storageClient = createStorageClient();
  const [createdFolderPromise, requestCanceler] = storageClient.createFolder(payload);

  const finalPromise = createdFolderPromise
    .then(response => {
      const user = localStorageService.getUser() as UserSettings;
      analyticsService.trackFolderCreated({
        email: user.email,
        platform: DevicePlatform.Web,
      });
      return response;
    })
    .catch(error => {
      throw errorService.castError(error);
    });

  return [finalPromise, requestCanceler];
}

export async function updateMetaData(folderId: number, metadata: DriveFolderMetadataPayload): Promise<void> {
  const storageClient = createStorageClient();
  const payload: StorageTypes.UpdateFolderMetadataPayload = {
    folderId: folderId,
    changes: metadata
  };
  return storageClient.updateFolder(payload)
    .then(() => {
      const user: UserSettings = localStorageService.getUser() as UserSettings;
      analyticsService.trackFolderRename({
        email: user.email,
        fileId: folderId,
        platform: DevicePlatform.Web,
      });
    });
}

export function deleteFolder(folderData: DriveFolderData): Promise<void> {
  const storageClient = createStorageClient();
  return storageClient.deleteFolder(folderData.id)
    .then(() => {
      const user = localStorageService.getUser() as UserSettings;
      analyticsService.trackDeleteItem(folderData as DriveItemData, {
        email: user.email,
        platform: DevicePlatform.Web,
      });
    });
}

async function fetchFolderTree(folderId: number): Promise<{
  tree: FolderTree;
  folderDecryptedNames: Record<number, string>;
  fileDecryptedNames: Record<number, string>;
  size: number;
}> {
  const { tree, size } = await httpService.get<{ tree: FolderTree; size: number }>(`/api/storage/tree/${folderId}`);
  const folderDecryptedNames: Record<number, string> = {};
  const fileDecryptedNames: Record<number, string> = {};

  // ! Decrypts folders and files names
  const pendingFolders: FolderTree[] = [tree];
  while (pendingFolders.length > 0) {
    const currentTree = pendingFolders[0];
    const { folders, files } = {
      folders: currentTree.children,
      files: currentTree.files,
    };

    folderDecryptedNames[currentTree.id] = aes.decrypt(
      currentTree.name,
      `${process.env.REACT_APP_CRYPTO_SECRET2}-${currentTree.parentId}`,
    );

    for (const file of files) {
      fileDecryptedNames[file.id] = aes.decrypt(file.name, `${process.env.REACT_APP_CRYPTO_SECRET2}-${file.folderId}`);
    }

    pendingFolders.shift();

    // * Adds current folder folders to pending
    pendingFolders.push(...folders);
  }

  return { tree, folderDecryptedNames, fileDecryptedNames, size };
}

export async function moveFolder(
  folderId: number, destination: number
): Promise<StorageTypes.MoveFolderResponse> {
  const storageClient = createStorageClient();
  const payload: StorageTypes.MoveFolderPayload = {
    folderId: folderId,
    destinationFolderId: destination
  };

  return storageClient.moveFolder(payload)
    .then(response => {
      const user = localStorageService.getUser() as UserSettings;
      analyticsService.trackMoveItem('folder', {
        file_id: response.item.id,
        email: user.email,
        platform: DevicePlatform.Web,
      });
      return response;
    })
    .catch((err) => {
      const castedError = errorService.castError(err);
      if (castedError.status) {
        castedError.message = i18n.get(`tasks.move-folder.errors.${castedError.status}`);
      }
      throw castedError;
    });
}

const folderService = {
  createFolder,
  updateMetaData,
  deleteFolder,
  moveFolder,
  fetchFolderTree,
};

export default folderService;
