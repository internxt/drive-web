import axios, { CancelTokenSource } from 'axios';
const CancelToken = axios.CancelToken;

import localStorageService from './local-storage.service';
import analyticsService from './analytics.service';
import {
  DriveFileData,
  DriveFolderData,
  DriveFolderMetadataPayload,
  DriveItemData,
  UserSettings,
} from '../models/interfaces';
import { DevicePlatform } from '../models/enums';
import httpService from './http.service';
import errorService from './error.service';

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

export interface IContentFolder {
  bucket: string;
  children: FolderChild[];
  color: string;
  createdAt: string;
  encrypt_version: string;
  files: DriveItemData[];
  icon: string;
  iconId: any;
  icon_id: any;
  id: number;
  name: string;
  parentId: number;
  parent_id: number;
  updatedAt: string;
  userId: number;
  user_id: number;
}

export interface FetchFolderContentResponse {
  folders: DriveFolderData[];
  files: DriveFileData[];
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

export function fetchFolderContent(folderId: number): [Promise<FetchFolderContentResponse>, CancelTokenSource] {
  const cancelTokenSource = CancelToken.source();
  const fn = async () => {
    try {
      const response = await httpService.get<IContentFolder>(`/api/storage/folder/${folderId}`, {
        cancelToken: cancelTokenSource.token,
      });
      const result: FetchFolderContentResponse = {
        folders: [],
        files: [],
      };

      if (response) {
        result.folders = response.children.map((folder) => ({ ...folder, isFolder: true }));
        result.files = response.files;
      }

      return result;
    } catch (err) {
      const castedError = errorService.castError(err);
      throw castedError;
    }
  };

  return [fn(), cancelTokenSource];
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

export function updateMetaData(itemId: number, data: DriveFolderMetadataPayload): Promise<void> {
  const user: UserSettings = localStorageService.getUser() as UserSettings;

  return httpService.post(`/api/storage/folder/${itemId}/meta`, data).then(() => {
    analyticsService.trackFolderRename({
      email: user.email,
      fileId: itemId,
      platform: DevicePlatform.Web,
    });
  });
}

export function deleteFolder(folderData: DriveFolderData): Promise<void> {
  const user = localStorageService.getUser() as UserSettings;

  return httpService.delete(`/api/storage/folder/${folderData.id}`).then(() => {
    analyticsService.trackDeleteItem(folderData, {
      email: user.email,
      platform: DevicePlatform.Web,
    });
  });
}

export async function moveFolder(data: MoveFolderPayload): Promise<MoveFolderResponse> {
  const user = localStorageService.getUser() as UserSettings;
  const response = await httpService.post<MoveFolderPayload, MoveFolderResponse>('/api/storage/move/folder', data);

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
};

export default folderService;
