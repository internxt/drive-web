import { getHeaders } from '../lib/auth';
import _ from 'lodash';

import fileService from './file.service';
import history from '../lib/history';
import localStorageService from './localStorage.service';
import analyticsService from './analytics.service';
import { UserSettings } from '../models/interfaces';
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

export async function fetchFolderContent(rootId: string, isTeam: boolean): Promise<any> {
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
      const welcomeFile = await fileService.fetchWelcomeFile(isTeam);
      const newCommanderFolders = extendUIPropertiesOf(contentFolders).newCommanderFolders;
      let newCommanderFiles = extendUIPropertiesOf(contentFolders).newCommanderFiles;

      if (!contentFolders.parentId && welcomeFile) {
        newCommanderFiles = _.concat([{
          id: 0,
          file_id: '0',
          fileId: '0',
          name: 'Welcome',
          type: 'pdf',
          size: 0,
          isDraggable: false,
          get onClick() {
            return () => {
              fileService.openWelcomeFile();
            };
          },
          onDelete: async () => {
            await fileService.deleteWelcomeFile(false);
          }
        }], newCommanderFiles);
      }
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
  try {
    const user = localStorageService.getUser();
    const fetchCreateFolder = await fetch('/api/storage/folder', {
      method: 'post',
      headers: getHeaders(true, true, isTeam),
      body: JSON.stringify({
        parentFolderId: currentFolderId,
        folderName
      })
    });
    const createdFolder = await fetchCreateFolder.json();

    if (fetchCreateFolder.status !== 201) {
      throw new Error(`The folder cannot be created ${fetchCreateFolder.status}`);
    }

    analyticsService.trackFolderCreated({
      email: user.email,
      platform: DevicePlatform.Web
    });

    return createdFolder;
  } catch (err) {
    throw new Error(`The folder cannot be created ${err}`);
  }
}

export function updateMetaData(itemId: number, data: any): Promise<void> {
  const user: UserSettings = localStorageService.getUser();

  return fetch(`/api/storage/folder/${itemId}/meta`, {
    method: 'post',
    headers: getHeaders(true, true, !!user.teams),
    body: data
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

export function deleteItems(isTeam: boolean, selectedItems: any[]) {
  const user: UserSettings = localStorageService.getUser();
  const fetchOptions = {
    method: 'DELETE',
    headers: getHeaders(true, false, isTeam)
  };

  if (selectedItems.length === 0) {
    return;
  }

  return _.map(selectedItems, (v) => {
    if (v.onDelete) {
      return (next) => {
        v.onDelete(); next();
      };
    }
    const url = v.isFolder
      ? `/api/storage/folder/${v.id}`
      : `/api/storage/folder/${v.folderId}/file/${v.id}`;

    return (next) =>
      fetch(url, fetchOptions).then(() => {
        analyticsService.trackDeleteItem(v, {
          email: user.email,
          platform: DevicePlatform.Web
        });
        next();
      }).catch(next);
  });
}

const folderService = {
  fetchFolderContent,
  createFolder,
  updateMetaData,
  deleteItems
};

export default folderService;