import { toast } from 'react-toastify';

import { ActionState } from '@internxt/inxt-js/build/api/ActionState';
import { DriveFileData } from '../../types';
import analyticsService from '../../../analytics/services/analytics.service';
import { AppView, DevicePlatform } from '../../../core/types';
import localStorageService from '../../../core/services/local-storage.service';
import navigationService from '../../../core/services/navigation.service';
import { getEnvironmentConfig, Network } from '../network';
import { encryptFilename } from '../../../crypto/services/utils';
import httpService from '../../../core/services/http.service';
import errorService from '../../../core/services/error.service';

export interface ItemToUpload {
  name: string;
  size: number;
  type: string;
  content: File;
  parentFolderId: number;
  relativePath: string;
}

export function uploadFile(
  userEmail: string,
  file: ItemToUpload,
  isTeam: boolean,
  updateProgressCallback: (progress: number) => void,
): [Promise<DriveFileData>, ActionState | undefined] {
  let promise: Promise<DriveFileData>;
  let actionState: ActionState | undefined;

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
      navigationService.push(AppView.Login);

      throw new Error('Bucket not found!');
    }

    const network = new Network(bridgeUser, bridgePass, encryptionKey);
    const content = new Blob([file.content], { type: file.type });
    const [uploadFilePromise, uploadFileActionState] = network.uploadFile(bucketId, {
      filepath: file.relativePath,
      filesize: file.size,
      filecontent: content,
      progressCallback: updateProgressCallback,
    });

    promise = uploadFilePromise.then(async (fileId) => {
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
        encrypt_version,
      };
      const headers = httpService.getHeaders(true, true, isTeam);
      const createFileEntry = () => {
        const body = JSON.stringify({ file: fileEntry });
        const params = { method: 'post', headers, body };

        return fetch(`${process.env.REACT_APP_API_URL}/api/storage/file`, params);
      };
      const response: Response = await createFileEntry();
      const data: DriveFileData = await response.json();

      analyticsService.trackFileUploadFinished({
        file_size: file.size,
        file_id: data.id,
        file_type: file.type,
        email: userEmail,
      });

      if (response.status === 402) {
        throw new Error('Rate limited');
      }

      return data;
    });
    actionState = uploadFileActionState;
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

    throw err;
  }

  return [promise, actionState];
}

export default uploadFile;
