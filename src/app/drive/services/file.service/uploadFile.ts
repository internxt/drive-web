import { StorageTypes } from '@internxt/sdk/dist/drive';
import { DriveFileData } from '../../types';
import analyticsService from '../../../analytics/services/analytics.service';
import { AppView, DevicePlatform } from '../../../core/types';
import localStorageService from '../../../core/services/local-storage.service';
import navigationService from '../../../core/services/navigation.service';
import { getEnvironmentConfig } from '../network.service';
import { encryptFilename } from '../../../crypto/services/utils';
import errorService from '../../../core/services/error.service';
import { SdkFactory } from '../../../core/factory/sdk';
import { uploadFile as upload } from 'app/network/upload';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';

export interface ItemToUpload {
  name: string;
  size: number;
  type: string;
  content: File;
  parentFolderId: number;
}

export async function uploadFile(
  userEmail: string,
  file: ItemToUpload,
  isTeam: boolean,
  updateProgressCallback: (progress: number) => void,
  abortController?: AbortController
): Promise<DriveFileData> {
  const { bridgeUser, bridgePass, encryptionKey, bucketId } = getEnvironmentConfig(isTeam);

  try {
    analyticsService.trackFileUploadStarted({ size: file.size, type: file.type });

    if (!bucketId) {
      //analyticsService.trackFileUploadBucketIdUndefined({ email: userEmail, platform: DevicePlatform.Web });
      notificationsService.show({ text: 'Login again to start uploading files', type: ToastType.Warning });
      localStorageService.clear();
      navigationService.push(AppView.Login);

      throw new Error('Bucket not found!');
    }

    const fileId = await upload(bucketId, {
      creds: {
        pass: bridgePass,
        user: bridgeUser
      },
      filecontent: file.content,
      filesize: file.size,
      mnemonic: encryptionKey,
      progressCallback: (totalBytes, uploadedBytes) => {
        updateProgressCallback(uploadedBytes / totalBytes);
      },
      abortController
    });

    const name = encryptFilename(file.name, file.parentFolderId);
    const storageClient = SdkFactory.getInstance().createStorageClient();
    const fileEntry: StorageTypes.FileEntry = {
      id: fileId,
      type: file.type,
      size: file.size,
      name: name,
      bucket: bucketId,
      folder_id: file.parentFolderId,
      encrypt_version: StorageTypes.EncryptionVersion.Aes03,
    };

    const response = await storageClient.createFileEntry(fileEntry);

    analyticsService.trackFileUploadCompleted({ size: file.size, type: file.type, file_id: fileId, parent_folder_id: file.parentFolderId });

    return response;
  } catch (err: unknown) {
    const castedError = errorService.castError(err);

    if (!abortController?.signal.aborted) {
      analyticsService.trackFileUploadError({ messageError: castedError.message, size: file.size, type: file.type });
    } else {
      analyticsService.trackFileUploadCanceled({ size: file.size, type: file.type });
    }

    throw err;
  }
}

export default uploadFile;
