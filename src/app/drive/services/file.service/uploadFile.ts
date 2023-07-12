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
  trackingParameters: { isMultipleUpload: 0 | 1; processIdentifier: string },
  abortController?: AbortController,
): Promise<DriveFileData> {
  const { bridgeUser, bridgePass, encryptionKey, bucketId } = getEnvironmentConfig(isTeam);
  const isBrave = !!(navigator.brave && (await navigator.brave.isBrave()));

  const trackingUploadProperties: TrackingPlan.UploadProperties = {
    file_upload_id: analyticsService.getTrackingActionId(),
    file_size: file.size,
    file_extension: file.type,
    parent_folder_id: file.parentFolderId,
    file_name: file.name,
    bandwidth: 0,
    band_utilization: 0,
    process_identifier: trackingParameters?.processIdentifier,
    is_multiple: trackingParameters?.isMultipleUpload,
    is_brave: isBrave,
  };
  try {
    analyticsService.trackFileUploadStarted(trackingUploadProperties);

    if (!bucketId) {
      analyticsService.trackFileUploadError({
        ...trackingUploadProperties,
        bucket_id: 0,
        error_message: 'Bucket not found',
        error_message_user: 'Login again to start uploading files',
        stack_trace: '',
      });
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
        error_message_user: castedError.message,
        stack_trace: castedError?.stack ?? 'Unknwon stack trace',
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
