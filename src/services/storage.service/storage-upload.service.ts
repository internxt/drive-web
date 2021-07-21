import { toast } from 'react-toastify';
import async from 'async';

import { encryptFilename, getFilenameAndExt, renameFile } from '../../lib/utils';
import { getEnvironmentConfig, Network } from '../../lib/network';
import localStorageService from '../localStorage.service';
import history from '../../lib/history';
import { getHeaders } from '../../lib/auth';
import analyticsService from '../analytics.service';
import { DevicePlatform } from '../../models/enums';
import storageNameService from './storage-name.service';

interface IFileToUploadService {
  files: any[] //this object will change
  parentFolderId: number
  currentFolderId: number
  namePath: any[] //this object will change
  currentCommanderItems: any[] //this object will change
  isTeam: boolean
  folderPath?: string | undefined
}

interface IFileUpload {
  file: any,
  parentFolderId: number
  folderPath: string | undefined
  isTeam: boolean
  name: string
}

export async function uploadItems(userEmail: string, files: IFileToUploadService): Promise<any> {

  files.files = Array.from(files.files);

  const filesToUpload: any[] = [];
  const MAX_ALLOWED_UPLOAD_SIZE = 1024 * 1024 * 1024;
  const showSizeWarning = files.files.some(file => file.size >= MAX_ALLOWED_UPLOAD_SIZE);

  console.log('File size trying to be uplodaded is %s bytes', files.files.reduce((accum, file) => accum + file.size, 0));

  if (showSizeWarning) {
    toast.warn('File too large.\nYou can only upload or download files of up to 1GB through the web app');
    return;
  }

  files.parentFolderId = files.parentFolderId || files.currentFolderId;

  let relativePath = files.namePath.map((pathLevel) => pathLevel.name).slice(1).join('/');

  // when a folder and its subdirectory is uploaded by drop, this.state.namePath keeps its value at the first level of the parent folder
  // so we need to add the relative folderPath (the path from parent folder uploaded to the level of the file being uploaded)
  // when uploading deeper files than the current level
  if (files.folderPath) {
    if (relativePath !== '') {
      relativePath += '/' + files.folderPath;
    } else {
      // if is the first path level, DO NOT ADD a '/'
      relativePath += files.folderPath;
    }
  }

  files.files.forEach(file => {
    const { filename, extension } = getFilenameAndExt(file.name);

    filesToUpload.push({ name: filename, size: file.size, type: extension, isLoading: true, content: file });
  });

  for (const file of filesToUpload) {
    const fileNameExists = storageNameService.checkFileNameExists(files.currentCommanderItems, file.name, file.type);

    if (files.parentFolderId === files.currentFolderId) {
      //ADD THE FILE FOR UPLOADING TO THE CURRENTCOMMANDERITEMS
      if (fileNameExists) {
        const name: string = file.isFolder ?
          storageNameService.getNewFolderName(file.name, files.currentCommanderItems) :
          storageNameService.getNewFileName(file.name, file.type, files.currentCommanderItems);

        file.name = name;
        // File browser object don't allow to rename, so you have to create a new File object with the old one.
        file.content = renameFile(file.content, file.name);
      }
    }
  }

  const uploadErrors: any[] = [];

  try {
    await async.eachLimit(filesToUpload, 1, (file: IFileUpload, nextFile) => {

      let rateLimited = false;

      file.parentFolderId = files.parentFolderId;
      file.isTeam = files.isTeam;
      file.file = file;
      file.folderPath = files.folderPath;

      uploadItem(userEmail, file)
        .then(({ res, data }) => {
          //STATUS: FINISH UPLOADING FILE
          console.log('--FINISH UPLOAD FILE--');

          if (files.parentFolderId === files.currentFolderId) {
            const index = files.currentCommanderItems.findIndex((obj) => obj.name === file.name);
            const filesInFileExplorer = [...files.currentCommanderItems];

            filesInFileExplorer[index].isLoading = false;
            filesInFileExplorer[index].fileId = data.fileId;
            filesInFileExplorer[index].id = data.id;
          }

          if (res.status === 402) {
            rateLimited = true;
            throw new Error('Rate limited');
          }
        }).catch((err) => {
          uploadErrors.push(err);
          console.log(err);
          //DELETE ITEM FROM FILE EXPLORER
        }).finally(() => {
          if (rateLimited) {
            return nextFile(Error('Rate limited'));
          }
          nextFile(null);
        });

      if (uploadErrors.length > 0) {
        throw new Error('There were some errors during upload');
      }
    });
  } catch (err) {
    //STATUS: ERROR UPLOAD FILE
    if (err.message === 'There were some errors during upload') {
      // TODO: List errors in a queue?
      return uploadErrors.forEach(uploadError => {
        toast.warn(uploadError.message);
      });
    }

    toast.warn(err.message);
  }

  return null;
}

export async function uploadItem(userEmail: string, file: IFileUpload): Promise<any> {
  if (!file.parentFolderId) {
    throw new Error('No folder ID provided');
  }

  try {
    analyticsService.trackFileUploadStart({ file_size: file.size, file_type: file.type, folder_id: file.parentFolderId, email, platform: DevicePlatform.web });

    const { bridgeUser, bridgePass, encryptionKey, bucketId } = getEnvironmentConfig(file.isTeam);

    if (!bucketId) {
      analyticsService.trackFileUploadBucketIdUndefined({ email: userEmail, platform: DevicePlatform.Web });
      toast.warn('Login again to start uploading files');
      localStorageService.clear();
      history.push('/login');
      return;
    }

    const network = new Network(bridgeUser, bridgePass, encryptionKey);

    const relativePath = file.folderPath + file.file.name + (file.file.type ? '.' + file.file.type : '');
    const content = new Blob([file.file.content], { type: file.file.type });

    const fileId = await network.uploadFile(bucketId, {
      filepath: relativePath,
      filesize: file.file.size,
      filecontent: content,
      progressCallback: (progress: number) => {
        //STATUS: UPLOAD FILE PROGRESS AS % AND UPLOADING
      }
    });

    const name = encryptFilename(file.file.name, file.file.parentFolderId);

    const folder_id = file.parentFolderId;
    const { size, type } = file.file;
    const encrypt_version = '03-aes';
    // TODO: fix mismatched fileId fields in server and remove file_id here
    const fileEntry = { fileId, file_id: fileId, type, bucket: bucketId, size, folder_id, name, encrypt_version };
    const headers = getHeaders(true, true, file.isTeam);

    const createFileEntry = () => {
      const body = JSON.stringify({ file: fileEntry });
      const params = { method: 'post', headers, body };

      return fetch('/api/storage/file', params);
    };

    let res;
    const data = await createFileEntry().then(response => {
      res = response;
      return res.json();
    });

    analyticsService.trackFileUploadFinished({ file_size: file.size, file_id: data.id, file_type: file.type, email });

    return { res, data };

  } catch (err) {
    analyticsService.trackFileUploadError({ file_size: file.size, file_type: file.type, folder_id: file.parentFolderId, email, msg: err.message, platform: DevicePlatform.web });
    toast.warn(`File upload error. Reason: ${err.message}`);

    throw err;
  }
}

const uploadService = {
  uploadItems,
  uploadItem
};

export default uploadService;