import { toast } from 'react-toastify';

import { encryptFilename } from '../../lib/utils';
import { getEnvironmentConfig, Network } from '../../lib/network';
import localStorageService from '../localStorage.service';
import history from '../../lib/history';
import { getHeaders } from '../../lib/auth';
import analyticsService from '../analytics.service';
import { DevicePlatform, FileActionTypes, FileStatusTypes } from '../../models/enums';

export interface UploadItemPayload {
  file: any,
  parentFolderId: number
  folderPath: string | undefined
  isTeam: boolean
  name: string
}

export async function uploadItem(userEmail: string, file: UploadItemPayload, path: string, isTeam: boolean): Promise<any> {
  if (!file.parentFolderId) {
    throw new Error('No folder ID provided');
  }

  try {
    analyticsService.trackFileUploadStart({ file_size: file.size, file_type: file.type, folder_id: file.parentFolderId, userEmail, platform: DevicePlatform.Web });
    const { bridgeUser, bridgePass, encryptionKey, bucketId } = getEnvironmentConfig(isTeam);

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
        if (progress > 0) {
          dispatch(updateFileStatusLogger({ action: FileActionTypes.Upload, status: FileStatusTypes.Uploading, filePath: path, progress: progress.toFixed(2), isFolder: false, type: fileType }));
        }
      }
    });

    const name = encryptFilename(file.file.name, file.file.parentFolderId);

    const folder_id = file.parentFolderId;
    const { size, type } = file.file;
    const encrypt_version = '03-aes';
    // TODO: fix mismatched fileId fields in server and remove file_id here
    const fileEntry = { fileId, file_id: fileId, type, bucket: bucketId, size, folder_id, name, encrypt_version };
    const headers = getHeaders(true, true, isTeam);

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

    analyticsService.trackFileUploadFinished({ file_size: file.size, file_id: data.id, file_type: file.type, userEmail });

    return { res, data };

  } catch (err) {
    analyticsService.trackFileUploadError({ file_size: file.size, file_type: file.type, folder_id: file.parentFolderId, userEmail, msg: err.message, platform: DevicePlatform.Web });
    toast.warn(`File upload error. Reason: ${err.message}`);

    throw err;
  }
}

const uploadService = {
  uploadItem
};

export default uploadService;