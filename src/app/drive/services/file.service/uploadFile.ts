import { StorageTypes } from '@internxt/sdk/dist/drive';
import { DriveFileData } from 'app/drive/types';
import analyticsService from '../../../analytics/services/analytics.service';
import { TrackingPlan } from '../../../analytics/TrackingPlan';
import { AppView } from '../../../core/types';
import localStorageService from '../../../core/services/local-storage.service';
import navigationService from '../../../core/services/navigation.service';
import { getEnvironmentConfig } from '../network.service';
import { encryptFilename } from '../../../crypto/services/utils';
import errorService from '../../../core/services/error.service';
import { SdkFactory } from '../../../core/factory/sdk';
import { uploadFile as uploadToBucket } from 'app/network/upload';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import { generateThumbnailFromFile } from '../thumbnail.service';
import * as uuid from 'uuid';

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
  const trackingUploadProperties: TrackingPlan.UploadProperties = {
    file_upload_id: analyticsService.getTrackingActionId(),
    file_size: file.size,
    file_extension: file.type,
    parent_folder_id: file.parentFolderId,
    file_name: file.name,
  };
  try {
    analyticsService.trackFileUploadStarted(trackingUploadProperties);

    if (!bucketId) {
      analyticsService.trackFileUploadError({
        ...trackingUploadProperties,
        bucket_id: 0,
        error_message: 'Bucket not found',
      });
      notificationsService.show({ text: 'Login again to start uploading files', type: ToastType.Warning });
      localStorageService.clear();
      navigationService.push(AppView.Login);

      throw new Error('Bucket not found!');
    }
    let fileId;

    if (file.size !== 0) {
      fileId = await uploadToBucket(bucketId, {
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
    }
    const name = encryptFilename(file.name, file.parentFolderId);

    const storageClient = SdkFactory.getInstance().createStorageClient();
    const fileEntry: StorageTypes.FileEntry = {
      id: fileId ? fileId : uuid.v4().substring(0, 20),
      type: file.type,
      size: file.size,
      name: name,
      plain_name: file.name,
      bucket: bucketId,
      folder_id: file.parentFolderId,
      encrypt_version: StorageTypes.EncryptionVersion.Aes03,
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

    analyticsService.trackFileUploadCompleted({
      ...trackingUploadProperties,
      file_id: response.id,
      bucket_id: parseInt(bucketId),
    });

    return response;
  } catch (err: unknown) {
    const castedError = errorService.castError(err);

    if (!abortController?.signal.aborted) {
      analyticsService.trackFileUploadError({
        ...trackingUploadProperties,
        bucket_id: parseInt(bucketId),
        error_message: castedError.message,
      });
    } else {
      analyticsService.trackFileUploadAborted({
        ...trackingUploadProperties,
        bucket_id: parseInt(bucketId),
      });
    }

    throw err;
  }
}

export default uploadFile;
