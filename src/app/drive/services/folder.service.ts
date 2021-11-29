import axios, { CancelTokenSource } from 'axios';
const CancelToken = axios.CancelToken;

import { DriveFileData, DriveFolderData, DriveFolderMetadataPayload, DriveItemData, FolderTree } from '../types';
import errorService from '../../core/services/error.service';
import { aes, items } from '@internxt/lib';
import fileService from './file.service';
import httpService from '../../core/services/http.service';
import { DevicePlatform } from '../../core/types';
import analyticsService from '../../analytics/services/analytics.service';
import i18n from '../../i18n/services/i18n.service';
import localStorageService from '../../core/services/local-storage.service';
import { UserSettings } from '../../auth/types';

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

export interface CreateFolderPayload {
  parentFolderId: number;
  folderName: string;
}

export interface CreateFolderResponse {
  bucket: string;
  id: number;
  name: string;
  parentId: number;
  createdAt: string;
  updatedAt: string;
  userId: number;
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

export interface MoveFolderPayload {
  folderId: number;
  destination: number;
}

export interface MoveFolderResponse {
  item: DriveFolderData;
  destination: number;
  moved: boolean;
}

export function fetchFolderContent(
  folderId: number,
): [Promise<{ folders: DriveFolderData[]; files: DriveFileData[] }>, CancelTokenSource] {
  const cancelTokenSource = CancelToken.source();
  const fn = async () => {
    const response = await httpService.get<FetchFolderContentResponse>(`/api/storage/v2/folder/${folderId}`, {
      cancelToken: cancelTokenSource.token,
    });
    const result: { folders: DriveFolderData[]; files: DriveFileData[] } = {
      folders: [],
      files: [],
    };

    if (response) {
      result.folders = response.children.map((folder) => ({ ...folder, isFolder: true }));
      result.files = response.files;
    }

    return result;
  };

  return [
    fn().catch((err) => {
      const castedError = errorService.castError(err);
      throw castedError;
    }),
    cancelTokenSource,
  ];
}

export function createFolder(
  currentFolderId: number,
  folderName: string,
): [Promise<CreateFolderResponse>, CancelTokenSource] {
  const cancelTokenSource = CancelToken.source();
  const fn = async () => {
    try {
      const user = localStorageService.getUser() as UserSettings;
      const data: CreateFolderPayload = {
        parentFolderId: currentFolderId,
        folderName,
      };
      const response = await httpService.post<CreateFolderPayload, CreateFolderResponse>('/api/storage/folder', data, {
        cancelToken: cancelTokenSource.token,
      });

      analyticsService.trackFolderCreated({
        email: user.email,
        platform: DevicePlatform.Web,
      });

      return response;
    } catch (err: unknown) {
      const castedError = errorService.castError(err);

      throw castedError;
    }
  };

  return [fn(), cancelTokenSource];
}

export async function updateMetaData(
  folderId: number,
  metadata: DriveFolderMetadataPayload,
  bucketId: string,
  relativePath: string,
): Promise<void> {
  const user: UserSettings = localStorageService.getUser() as UserSettings;

  await httpService.post(`/api/storage/folder/${folderId}/meta`, { metadata }).then(() => {
    analyticsService.trackFolderRename({
      email: user.email,
      fileId: folderId,
      platform: DevicePlatform.Web,
    });
  });

  // * Renames files on network recursively
  const pendingFolders = [{ relativePath, folderId }];
  while (pendingFolders.length > 0) {
    const currentFolder = pendingFolders[0];
    const [folderContentPromise] = fetchFolderContent(currentFolder.folderId);
    const { files, folders } = await folderContentPromise;

    pendingFolders.shift();

    // * Renames current folder files
    for (const file of files) {
      const relativePath = `${currentFolder.relativePath}/${items.getItemDisplayName(file)}`;

      fileService.renameFileInNetwork(file.fileId, bucketId, relativePath);
    }

    // * Adds current folder folders to pending
    pendingFolders.push(
      ...folders.map((folderData) => ({
        relativePath: `${currentFolder.relativePath}/${folderData.name}`,
        folderId: folderData.id,
      })),
    );
  }
}

export function deleteFolder(folderData: DriveFolderData): Promise<void> {
  const user = localStorageService.getUser() as UserSettings;

  return httpService.delete(`/api/storage/folder/${folderData.id}`).then(() => {
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
  folder: DriveFolderData,
  destination: number,
  destinationPath: string,
  bucketId: string,
): Promise<MoveFolderResponse> {
  const user = localStorageService.getUser() as UserSettings;

  const response = await httpService
    .post<MoveFolderPayload, MoveFolderResponse>('/api/storage/move/folder', {
      folderId: folder.id,
      destination,
    })
    .catch((err) => {
      const castedError = errorService.castError(err);

      if (castedError.status) {
        castedError.message = i18n.get(`tasks.move-folder.errors.${castedError.status}`);
      }

      throw castedError;
    });

  // * Renames files iterating over folders
  const pendingFolders = [{ destinationPath: `${destinationPath}/${folder.name}`, data: folder }];
  while (pendingFolders.length > 0) {
    const currentFolder = pendingFolders[0];
    const [folderContentPromise] = fetchFolderContent(currentFolder.data.id);
    const { files, folders } = await folderContentPromise;

    pendingFolders.shift();

    // * Renames current folder files
    for (const file of files) {
      const relativePath = `${currentFolder.destinationPath}/${items.getItemDisplayName(file)}`;

      fileService.renameFileInNetwork(file.fileId, bucketId, relativePath);
    }

    // * Adds current folder folders to pending
    pendingFolders.push(
      ...folders.map((folderData) => ({
        destinationPath: `${currentFolder.destinationPath}/${folderData.name}`,
        data: folderData,
      })),
    );
  }

  analyticsService.trackMoveItem('folder', {
    file_id: response.item.id,
    email: user.email,
    platform: DevicePlatform.Web,
  });

  return response;
}

const folderService = {
  fetchFolderContent,
  createFolder,
  updateMetaData,
  deleteFolder,
  moveFolder,
  fetchFolderTree,
};

export default folderService;
