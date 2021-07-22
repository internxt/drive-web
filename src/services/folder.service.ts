import { getHeaders } from '../lib/auth';
import _ from 'lodash';
import { deleteWelcomeFile, openWelcomeFile, getWelcomeFile } from './file.service';
import Settings from '../lib/settings';
import history from '../lib/history';
import * as trackServices from './tracks.service';

interface IFolders {
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

interface IChildrens {
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

interface ICreatedFolder {
  bucket: string
  id: number
  name: string
  parentId: number
  updatedAt: Date
  userId: number
}

interface IContentFolder {
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

function fetchContentFolder(rootId: string, isTeam: boolean): Promise<IContentFolder> {
  return fetch(`/api/storage/folder/${rootId}`, {
    method: 'get',
    headers: getHeaders(true, true, isTeam)
  }).then((res) => {
    if (res.status !== 200) {
      throw new Error(`Server failed with status ${res.status}`);
    }
    return res.json();
  });
}

function extendUIPropertiesOf(contentFolder: IContentFolder) {
  const folders: IFolders[] = _.map(contentFolder.children, (o: IFolders) =>
    _.extend({ isFolder: true, isSelected: false, isLoading: false, isDowloading: false }, o)
  );

  return { newCommanderFolders: folders, newCommanderFiles: contentFolder.files };
}

export async function getContentFolderService(rootId: string, isTeam: boolean) {
  try {
    const contentFolders = await fetchContentFolder(rootId, isTeam);

    if (contentFolders) {
      const welcomeFile = await getWelcomeFile(isTeam);
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
              openWelcomeFile();
            };
          },
          onDelete: async () => {
            await deleteWelcomeFile(false);
          }
        }], newCommanderFiles);
      }
      return { contentFolders, newCommanderFolders, newCommanderFiles };
    }
  } catch (err) {
    if (err.status && err.status === 401) {
      Settings.clear();
      history.push('/login');
      return;
    }
    throw err;
  }
}

export async function createFolder(isTeam: boolean, currentFolderId: number, folderName: string): Promise<ICreatedFolder[]> {
  try {
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
    return createdFolder;

  } catch (err) {
    throw new Error(`The folder cannot be created ${err}`);
  }
}

export function updateMetaData(data: any, itemId: number, isTeam: boolean) {

  return fetch(`/api/storage/folder/${itemId}/meta`, {
    method: 'post',
    headers: getHeaders(true, true, isTeam),
    body: data
  })
    .then()
    .catch((err) => {
      throw new Error(`Cannot update metadata folder ${err}`);
    });
}

export function deleteItems(isTeam: boolean, selectedItems: any[]) {
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
        trackServices.tracksDeleteItems(v);
        next();
      }).catch(next);
  });

}
