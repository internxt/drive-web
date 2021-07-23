import fileDownload from 'js-file-download';

import { getHeaders } from '../lib/auth';
import { DevicePlatform } from '../models/enums';
import analyticsService from './analytics.service';
import localStorageService from './localStorage.service';

export async function fetchWelcomeFile(isTeam: boolean): Promise<any> {
  return fetch('/api/welcome', {
    method: 'get',
    headers: getHeaders(true, false, isTeam)
  }).then(res => {
    return res.json();
  }).then(body => {
    return body.file_exists;
  });
}

export async function openWelcomeFile(): Promise<any> {
  analyticsService.trackOpenWelcomeFile();

  return fetch('/Internxt.pdf').then(res => res.blob()).then(obj => {
    fileDownload(obj, 'Welcome.pdf');
  }).catch((err) => {
    throw new Error(`File cannot be opened ${err.message}`);
  });
}

export async function deleteWelcomeFile(isTeam: boolean): Promise<Response> {
  analyticsService.trackDeleteWelcomeFile();

  return fetch('/api/welcome', {
    method: 'delete',
    headers: getHeaders(true, false, isTeam)
  }).catch(err => {
    throw new Error(`Cannot delete welcome file ${err.message}`);
  });
}

export function updateMetaData(itemId: string, data: any): Promise<void> {
  const user = localStorageService.getUser();
  const isTeam = user?.teams;

  return fetch(`/api/storage/file/${itemId}/meta`, {
    method: 'post',
    headers: getHeaders(true, true, isTeam),
    body: data
  }).then(() => {
    analyticsService.trackFileRename({
      file_id: itemId,
      email: user.email,
      platform: DevicePlatform.Web
    });
  })
    .catch((err) => {
      throw new Error(`Cannot update metadata file ${err}`);
    });
}

export function deleteFile(fileData: any): Promise<void> {
  const user = localStorageService.getUser();
  const fetchOptions = {
    method: 'DELETE',
    headers: getHeaders(true, false, !!user.teams)
  };

  return fetch(`/api/storage/folder/${fileData.folderId}/file/${fileData.id}`, fetchOptions).then(() => {
    analyticsService.trackDeleteItem(fileData, {
      email: user.email,
      platform: DevicePlatform.Web
    });
  });
}

const fileService = {
  fetchWelcomeFile,
  deleteWelcomeFile,
  openWelcomeFile,
  updateMetaData,
  deleteFile
};

export default fileService;