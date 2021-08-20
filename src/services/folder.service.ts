import axios, { AxiosResponse } from 'axios';

import localStorageService from './local-storage.service';
import analyticsService from './analytics.service';
import { DriveFileData, DriveFolderData, DriveFolderMetadataPayload, DriveItemData, UserSettings } from '../models/interfaces';
import { DevicePlatform } from '../models/enums';

export interface IFolders {
  bucket: string
  color: string
  createdAt: Date
  encrypt_version: string
  icon: string
  iconId: any
  icon_id: any
  id: number
  name: string
  parentId: number
  parent_id: number
  updatedAt: Date
  userId: number
  user_id: number
}

export interface FolderChild {
  bucket: string
  color: string
  createdAt: string
  encrypt_version: string
  icon: string
  iconId: any
  icon_id: any
  id: number
  name: string
  parentId: number
  parent_id: number
  updatedAt: string
  userId: number
  user_id: number
}

export interface CreatedFolder {
  bucket: string;
  id: number;
  name: string;
  parentId: number;
  createdAt: string;
  updatedAt: string;
  userId: number;
}

export interface IContentFolder {
  bucket: string
  children: FolderChild[]
  color: string
  createdAt: string
  encrypt_version: string
  files: DriveItemData[]
  icon: string
  iconId: any
  icon_id: any
  id: number
  name: string
  parentId: number
  parent_id: number
  updatedAt: string
  userId: number
  user_id: number

}

export interface FetchFolderContentResponse {
  folders: DriveFolderData[];
  files: DriveFileData[];
}

export async function fetchFolderContent(folderId: number): Promise<FetchFolderContentResponse> {
  try {
    const response: AxiosResponse = await axios.get(`/api/storage/folder/${folderId}`);
    const content: IContentFolder = response.data;
    const result: FetchFolderContentResponse = {
      folders: [],
      files: []
    };

    if (content) {
      result.folders = content.children.map(folder => ({ ...folder, isFolder: true }));
      result.files = content.files;
    }

    return result;
  } catch (error) {
    throw error;
  }
}

export async function createFolder(currentFolderId: number | null, folderName: string): Promise<CreatedFolder> {
  try {
    const user = localStorageService.getUser() as UserSettings;
    const response = await axios.post('/api/storage/folder', {
      parentFolderId: currentFolderId,
      folderName
    });

    analyticsService.trackFolderCreated({
      email: user.email,
      platform: DevicePlatform.Web
    });

    return response.data;
  } catch (error) {
    throw error.response.data.error || error;
  }
}

export function updateMetaData(itemId: number, data: DriveFolderMetadataPayload, isTeam: boolean): Promise<void> {
  const user: UserSettings = localStorageService.getUser() as UserSettings;

  return axios.post(`/api/storage/folder/${itemId}/meta`, data)
    .then(() => {
      analyticsService.trackFolderRename({
        email: user.email,
        fileId: itemId,
        platform: DevicePlatform.Web
      });
    });
}

export function deleteFolder(folderData: DriveFolderData, isTeam: boolean): Promise<void | Response> {
  const user = localStorageService.getUser() as UserSettings;

  return axios.delete(`/api/storage/folder/${folderData.id}`).then(() => {
    analyticsService.trackDeleteItem(folderData, {
      email: user.email,
      platform: DevicePlatform.Web
    });
  });
}

export async function moveFolder(data: { folderId: number, destination: number }): Promise<void> {
  const user = localStorageService.getUser() as UserSettings;
  const response = await axios.post('/api/storage/moveFolder', data);

  analyticsService.trackMoveItem('folder', {
    file_id: response.data.item.id,
    email: user.email,
    platform: DevicePlatform.Web
  });

  return response.data;
}

const folderService = {
  fetchFolderContent,
  createFolder,
  updateMetaData,
  deleteFolder,
  moveFolder
};

export default folderService;
