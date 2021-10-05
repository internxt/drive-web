import { items } from '@internxt/lib';
import { createHash } from 'crypto';
import { DevicePlatform } from '../models/enums';
import { DriveFileData, DriveFileMetadataPayload, UserSettings } from '../models/interfaces';
import analyticsService from './analytics.service';
import httpService from './http.service';
import localStorageService from './local-storage.service';

export interface MoveFilePayload {
  fileId: string;
  destination: number;
  bucketId: string;
  relativePath: string;
}
export interface MoveFileResponse {
  item: DriveFileData;
  destination: number;
  moved: boolean;
}

export function updateMetaData(itemId: string, data: DriveFileMetadataPayload): Promise<void> {
  const user = localStorageService.getUser() as UserSettings;

  return httpService.post(`/api/storage/file/${itemId}/meta`, data).then(() => {
    analyticsService.trackFileRename({
      file_id: itemId,
      email: user.email,
      platform: DevicePlatform.Web,
    });
  });
}

export function deleteFile(fileData: DriveFileData): Promise<void> {
  const user = localStorageService.getUser() as UserSettings;

  return httpService.delete(`/api/storage/folder/${fileData.folderId}/file/${fileData.id}`).then(() => {
    analyticsService.trackDeleteItem(fileData, {
      email: user.email,
      platform: DevicePlatform.Web,
    });
  });
}

export async function moveFile(
  file: DriveFileData,
  destination: number,
  destinationPath: string,
  bucketId: string,
): Promise<MoveFileResponse> {
  const user = localStorageService.getUser() as UserSettings;
  const relativePath = `${destinationPath}/${items.getItemDisplayName(file)}`;
  const hashedRelativePath = createHash('ripemd160').update(relativePath).digest('hex');

  console.log('moveFile - relativePath: ', relativePath);

  const response = await httpService.post<MoveFilePayload, MoveFileResponse>('/api/storage/move/file', {
    fileId: file.fileId,
    destination,
    relativePath: hashedRelativePath,
    bucketId,
  });

  analyticsService.trackMoveItem('file', {
    file_id: response.item.id,
    email: user.email,
    platform: DevicePlatform.Web,
  });

  return response;
}

async function fetchRecents(limit: number): Promise<DriveFileData[]> {
  const response = await httpService.get<DriveFileData[]>(`/api/storage/recents?limit=${limit}`);

  return response;
}

const fileService = {
  updateMetaData,
  deleteFile,
  moveFile,
  fetchRecents,
};

export default fileService;
