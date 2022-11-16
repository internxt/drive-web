import { StorageTypes } from '@internxt/sdk/dist/drive';
import { DriveFileData } from 'app/drive/types';
import analyticsService from '../../../analytics/services/analytics.service';
import { AppView, DevicePlatform } from '../../../core/types';
import localStorageService from '../../../core/services/local-storage.service';
import navigationService from '../../../core/services/navigation.service';
import { getEnvironmentConfig } from '../network.service';
import { encryptFilename } from '../../../crypto/services/utils';
import errorService from '../../../core/services/error.service';
import { SdkFactory } from '../../../core/factory/sdk';
import { uploadFile as uploadToBucket } from 'app/network/upload';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import { generateThumbnailFromFile } from '../thumbnail.service';

export interface FileToUpload {
  name: string;
  size: number;
  type: string;
  content: File;
  parentFolderId: number;
}

export async function uploadFile(
  userEmail: string,
  file: FileToUpload,
  isTeam: boolean,
  updateProgressCallback: (progress: number) => void,
  abortController?: AbortController,
): Promise<DriveFileData> {
  const { bridgeUser, bridgePass, encryptionKey, bucketId } = getEnvironmentConfig(isTeam);

  try {
    if (!bucketId) {
      analyticsService.trackFileUploadBucketIdUndefined({ email: userEmail, platform: DevicePlatform.Web });
      notificationsService.show({ text: 'Login again to start uploading files', type: ToastType.Warning });
      localStorageService.clear();
      navigationService.push(AppView.Login);

      throw new Error('Bucket not found!');
    }

    const fileId = await uploadToBucket(bucketId, {
      creds: {
        pass: bridgePass,
        user: bridgeUser,
      },
      filecontent: file.content,
      filesize: file.size,
      mnemonic: encryptionKey,
      progressCallback: (totalBytes, uploadedBytes) => {
        updateProgressCallback(uploadedBytes / totalBytes);
      },
      abortController,
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
      plain_name: file.name
    };

    let response = await storageClient.createFileEntry(fileEntry);
    if (!response.thumbnails) {
      response = {
        ...response,
        thumbnails: [],
      };
    }

    const generatedThumbnail = await generateThumbnailFromFile(file, response.id, userEmail, isTeam);
    if (generatedThumbnail && generatedThumbnail.thumbnail) {
      response.thumbnails.push(generatedThumbnail.thumbnail);
      if (generatedThumbnail.thumbnailFile) {
        generatedThumbnail.thumbnail.urlObject = URL.createObjectURL(generatedThumbnail.thumbnailFile);
        response.currentThumbnail = generatedThumbnail.thumbnail;
      }
    }

    return response;
  } catch (err: any) {
    if (!abortController?.signal.aborted) {
      // analyticsService.trackFileUploadError(err.message, file.type, file.size);
    }

    throw err;
  }
}

export default uploadFile;
