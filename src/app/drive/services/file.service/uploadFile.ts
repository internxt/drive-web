import { toast } from 'react-toastify';
import { StorageTypes } from '@internxt/sdk/dist/drive';
import { ActionState } from '@internxt/inxt-js/build/api/ActionState';
import { DriveFileData } from '../../types';
import analyticsService from '../../../analytics/services/analytics.service';
import { AppView, DevicePlatform } from '../../../core/types';
import localStorageService from '../../../core/services/local-storage.service';
import navigationService from '../../../core/services/navigation.service';
import { getEnvironmentConfig, Network } from '../network';
import { encryptFilename } from '../../../crypto/services/utils';
import errorService from '../../../core/services/error.service';
import { createStorageClient } from '../../../core/factory/sdk';

export interface ItemToUpload {
  name: string;
  size: number;
  type: string;
  content: File;
  parentFolderId: number;
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
      filesize: file.size,
      filecontent: content,
      progressCallback: updateProgressCallback,
    });

    promise = uploadFilePromise.then(async (fileId) => {
      const name = encryptFilename(file.name, file.parentFolderId);
      const folder_id = file.parentFolderId;

      const storageClient = createStorageClient();

      const fileEntry: StorageTypes.FileEntry = {
        id: fileId,
        type: file.type,
        size: file.size,
        name: name,
        bucket: bucketId,
        folder_id: folder_id,
        encrypt_version: StorageTypes.EncryptionVersion.Aes03
      };

      return storageClient.createFileEntry(fileEntry)
        .then(response => {
          analyticsService.trackFileUploadFinished({
            file_size: file.size,
            file_id: response.id,
            file_type: file.type,
            email: userEmail,
          });
          return response;
        });
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
