import _ from 'lodash';

import { getHeaders } from '../lib/auth';
import fileService from './file.service';
import history from '../lib/history';
import localStorageService from './localStorage.service';
import analyticsService from './analytics.service';
import { DriveFolderData, DriveFolderMetadataPayload, UserSettings } from '../models/interfaces';
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

export interface IChildrens {
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

export interface ICreatedFolder {
  bucket: string
  id: number
  name: string
  parentId: number
  updatedAt: Date
  userId: number
}

export interface IContentFolder {
  bucket: string
  children: IChildrens[]
  color: string
  createdAt: Date
  encrypt_version: string
  files: any[]
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

function extendUIPropertiesOf(contentFolder: IContentFolder) {
  const folders: IFolders[] = _.map(contentFolder.children, (o: IFolders) =>
    _.extend({ isFolder: true, isSelected: false, isLoading: false, isDowloading: false }, o)
  );

  return { newCommanderFolders: folders, newCommanderFiles: contentFolder.files };
}

export async function fetchFolderContent(rootId: number, isTeam: boolean): Promise<any> {
  try {
    const response: Response = await fetch(`/api/storage/folder/${rootId}`, {
      method: 'get',
      headers: getHeaders(true, true, isTeam)
    });

    if (response.status !== 200) {
      throw new Error(`Server failed with status ${response.status}`);
    }

    const contentFolders: IContentFolder = await response.json();

    if (contentFolders) {
      const newCommanderFolders = extendUIPropertiesOf(contentFolders).newCommanderFolders;
      const newCommanderFiles = extendUIPropertiesOf(contentFolders).newCommanderFiles;

      return { contentFolders, newCommanderFolders, newCommanderFiles };
    }
  } catch (err) {
    if (err.status && err.status === 401) {
      localStorageService.clear();
      history.push('/login');
    } else {
      throw err;
    }
  }
}

export async function createFolder(isTeam: boolean, currentFolderId: number | null, folderName: string): Promise<ICreatedFolder[]> {
  const user = localStorageService.getUser();
  const response = await fetch('/api/storage/folder', {
    method: 'post',
    headers: getHeaders(true, true, isTeam),
    body: JSON.stringify({
      parentFolderId: currentFolderId,
      folderName
    })
  });
  const responseJSON = await response.json();

  if (response.status !== 201) {
    throw `The folder cannot be created. ${responseJSON.error}`;
  }

  analyticsService.trackFolderCreated({
    email: user.email,
    platform: DevicePlatform.Web
  });

  return responseJSON;
}

export function updateMetaData(itemId: number, data: DriveFolderMetadataPayload): Promise<void> {
  const user: UserSettings = localStorageService.getUser();

  return fetch(`/api/storage/folder/${itemId}/meta`, {
    method: 'post',
    headers: getHeaders(true, true, !!user.teams),
    body: JSON.stringify(data)
  })
    .then(() => {
      analyticsService.trackFolderRename({
        email: user.email,
        fileId: itemId,
        platform: DevicePlatform.Web
      });
    })
    .catch((err) => {
      throw new Error(`Cannot update metadata folder ${err}`);
    });
}

export function deleteFolder(folderData: DriveFolderData): Promise<void | Response> {
  const user = localStorageService.getUser();
  const fetchOptions = {
    method: 'DELETE',
    headers: getHeaders(true, false, !!user.teams)
  };

  return fetch(`/api/storage/folder/${folderData.id}`, fetchOptions).then(() => {
    analyticsService.trackDeleteItem(folderData, {
      email: user.email,
      platform: DevicePlatform.Web
    });
  });
}

const folderService = {
  fetchFolderContent,
  createFolder,
  updateMetaData,
  deleteFolder
};

export default folderService;
