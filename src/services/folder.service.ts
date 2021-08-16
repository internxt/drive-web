import _ from 'lodash';

import { getHeaders } from '../lib/auth';
import history from '../lib/history';
import localStorageService from './localStorage.service';
import analyticsService from './analytics.service';
import { DriveFolderData, DriveFolderMetadataPayload, UserSettings } from '../models/interfaces';
import { DevicePlatform } from '../models/enums';
import notify, { ToastType } from '../components/Notifications';
import i18n from './i18n.service';
import axios from 'axios';

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
    _.extend({ isFolder: true }, o)
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
      console.log('catch fetchFolderContent: ', err);
      localStorageService.clear();
      history.push('/login');
    } else {
      throw err;
    }
  }
}

export async function createFolder(isTeam: boolean, currentFolderId: number | null, folderName: string): Promise<CreatedFolder> {
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
    throw responseJSON.error;
  }

  analyticsService.trackFolderCreated({
    email: user.email,
    platform: DevicePlatform.Web
  });

  return responseJSON;
}

export function updateMetaData(itemId: number, data: DriveFolderMetadataPayload, isTeam: boolean): Promise<void> {
  const user: UserSettings = localStorageService.getUser();

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
  const user = localStorageService.getUser();
  const fetchOptions = {
    method: 'DELETE',
    headers: getHeaders(true, false, isTeam)
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
