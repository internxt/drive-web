import { toast } from 'react-toastify';

import { encryptFilename } from '../../lib/utils';
import { getEnvironmentConfig, Network } from '../../lib/network';
import localStorageService from '../local-storage.service';
import history from '../../lib/history';
import { getHeaders } from '../../lib/auth';
import analyticsService from '../analytics.service';
import { DevicePlatform } from '../../models/enums';
import errorService from '../error.service';

export interface UploadItemPayload {
  file: any;
  size: number;
  type: string;
  parentFolderId: number;
  folderPath: string | undefined;
  isTeam: boolean;
  name: string;
}

export async function uploadItem(
  userEmail: string,
  file: UploadItemPayload,
  path: string,
  isTeam: boolean,
  updateProgressCallback: (progress: number) => void,
): Promise<any> {
  if (!file.parentFolderId) {
    throw new Error('No folder ID provided');
  }

  try {
    analyticsService.trackFileUploadStart({
      file_size: file.size,
      file_type: file.type,
      folder_id: file.parentFolderId,
      email: userEmail,
      platform: DevicePlatform.Web,
    });
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
      progressCallback: updateProgressCallback,
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

      return fetch(`${process.env.REACT_APP_API_URL}/api/storage/file`, params);
    };

    let res;
    const data = await createFileEntry().then((response) => {
      res = response;
      return res.json();
    });

    analyticsService.trackFileUploadFinished({
      file_size: file.size,
      file_id: data.id,
      file_type: file.type,
      email: userEmail,
    });

    return { res, data };
  } catch (err: unknown) {
    const castedError = errorService.castError(err);

    analyticsService.trackFileUploadError({
      file_size: file.size,
      file_type: file.type,
      folder_id: file.parentFolderId,
      email: userEmail,
      msg: castedError.message,
      platform: DevicePlatform.Web,
    });

    throw castedError;
  }
}

const uploadService = {
  uploadItem,
};

export default uploadService;
