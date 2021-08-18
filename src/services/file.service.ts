import axios from 'axios';
import { getHeaders } from '../lib/auth';
import { DevicePlatform } from '../models/enums';
import { DriveFileData, DriveFileMetadataPayload, UserSettings } from '../models/interfaces';
import analyticsService from './analytics.service';
import localStorageService from './local-storage.service';

export function updateMetaData(itemId: string, data: DriveFileMetadataPayload, isTeam: boolean): Promise<void> {
  const user = localStorageService.getUser() as UserSettings;

  return axios.post(`/api/storage/file/${itemId}/meta`, data).then(() => {
    analyticsService.trackFileRename({
      file_id: itemId,
      email: user.email,
      platform: DevicePlatform.Web
    });
  });
}

export function deleteFile(fileData: DriveFileData, isTeam: boolean): Promise<void> {
  const user = localStorageService.getUser() as UserSettings;
  const fetchOptions = {
    method: 'DELETE',
    headers: getHeaders(true, false, isTeam)
  };

  return fetch(`/api/storage/folder/${fileData.folderId}/file/${fileData.id}`, fetchOptions).then(() => {
    analyticsService.trackDeleteItem(fileData, {
      email: user.email,
      platform: DevicePlatform.Web
    });
  });
}

export async function moveFile(data: { fileId: string, destination: number }): Promise<void> {
  const user = localStorageService.getUser() as UserSettings;
  const response = await axios.post('/api/storage/moveFile', data);

  analyticsService.trackMoveItem('file', {
    file_id: response.data.item.id,
    email: user.email,
    platform: DevicePlatform.Web
  });

  return response.data;
}

async function fetchRecents(limit: number): Promise<DriveFileData[]> {
  const user: UserSettings | null = localStorageService.getUser();
  const fetchOptions = {
    method: 'GET',
    headers: getHeaders(true, false, !!user?.teams)
  };
  const response = await fetch(`/api/storage/recents?limit=${limit}`, fetchOptions);

  return response.json();
}

const fileService = {
  updateMetaData,
  deleteFile,
  moveFile,
  fetchRecents
};

export default fileService;