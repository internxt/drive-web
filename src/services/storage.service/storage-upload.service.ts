import { toast } from 'react-toastify';

import { encryptFilename } from '../../lib/utils';
import { getEnvironmentConfig, Network } from '../../lib/network';
import localStorageService from '../local-storage.service';
import history from '../../lib/history';
import { getHeaders } from '../../lib/auth';
import analyticsService from '../analytics.service';
import { DevicePlatform } from '../../models/enums';
import { DriveFileData } from '../../models/interfaces';

export interface ItemToUpload {
  name: string;
  size: number;
  type: string;
  content: File;
  parentFolderId: number;
  folderPath: string;

}

export async function uploadItem(userEmail: string, file: ItemToUpload, path: string, isTeam: boolean, updateProgressCallback: (progress: number) => void): Promise<DriveFileData> {
  if (!file.parentFolderId) {
    throw new Error('No folder ID provided');
  }

  try {
    analyticsService.trackFileUploadStart({ file_size: file.size, file_type: file.type, folder_id: file.parentFolderId, email: userEmail, platform: DevicePlatform.Web });
    const { bridgeUser, bridgePass, encryptionKey, bucketId } = getEnvironmentConfig(isTeam);

    if (!bucketId) {
      analyticsService.trackFileUploadBucketIdUndefined({ email: userEmail, platform: DevicePlatform.Web });
      toast.warn('Login again to start uploading files');
      localStorageService.clear();
      history.push('/login');

      throw new Error('Bucket not found!');
    }

    const network = new Network(bridgeUser, bridgePass, encryptionKey);

    const relativePath = file.folderPath + file.content.name + (file.type ? '.' + file.type : '');
    const content = new Blob([file.content], { type: file.type });

    const fileId = await network.uploadFile(bucketId, {
      filepath: relativePath,
      filesize: file.size,
      filecontent: content,
      progressCallback: updateProgressCallback
    });

    const name = encryptFilename(file.name, file.parentFolderId);
    const folder_id = file.parentFolderId;
    const encrypt_version = '03-aes';
    const fileEntry = {
      fileId,
      file_id: fileId,
      type: file.type,
      bucket: bucketId,
      size: file.size,
      folder_id,
      name,
      encrypt_version
    };
    const headers = getHeaders(true, true, isTeam);

    const createFileEntry = () => {
      const body = JSON.stringify({ file: fileEntry });
      const params = { method: 'post', headers, body };

      return fetch('/api/storage/file', params);
    };

    let res;
    const data: DriveFileData = await createFileEntry().then(response => {
      res = response;
      return res.json();
    });

    analyticsService.trackFileUploadFinished({ file_size: file.size, file_id: data.id, file_type: file.type, email: userEmail });

    if (res.status === 402) {
      throw new Error('Rate limited');
    }

    return data;

  } catch (err) {
    analyticsService.trackFileUploadError({ file_size: file.size, file_type: file.type, folder_id: file.parentFolderId, email: userEmail, msg: err.message, platform: DevicePlatform.Web });

    throw err;
  }
}

const uploadService = {
  uploadItem
};

export default uploadService;