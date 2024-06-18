import { StorageTypes } from '@internxt/sdk/dist/drive';
import { Network } from 'app/drive/services/network.service';
import { DriveFileData } from 'app/drive/types';
import { TrackingPlan } from '../../../analytics/TrackingPlan';
import analyticsService from '../../../analytics/services/analytics.service';
import { SdkFactory } from '../../../core/factory/sdk';
import errorService from '../../../core/services/error.service';
import localStorageService from '../../../core/services/local-storage.service';
import navigationService from '../../../core/services/navigation.service';
import { AppView } from '../../../core/types';
import { encryptFilename } from '../../../crypto/services/utils';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import { getEnvironmentConfig } from '../network.service';
import { generateThumbnailFromFile } from '../thumbnail.service';

export interface FileToUpload {
  name: string;
  size: number;
  type: string;
  content: File;
  parentFolderId: string;
}

export interface FileUploadOptions {
  isTeam: boolean;
  trackingParameters: { isMultipleUpload: 0 | 1; processIdentifier: string };
  abortController?: AbortController;
  ownerUserAuthenticationData?: {
    token: string;
    bridgeUser: string;
    bridgePass: string;
    encryptionKey: string;
    bucketId: string;
  };
  abortCallback?: (abort?: () => void) => void;
}

export async function uploadFile(
  userEmail: string,
  file: FileToUpload,
  updateProgressCallback: (progress: number) => void,
  options: FileUploadOptions,
  continueUploadOptions: {
    taskId: string;
    isPaused: boolean;
    isRetriedUpload: boolean;
  },
): Promise<DriveFileData> {
  const { bridgeUser, bridgePass, encryptionKey, bucketId } =
    options.ownerUserAuthenticationData ?? getEnvironmentConfig(options.isTeam);
  const isBrave = !!(navigator.brave && (await navigator.brave.isBrave()));

  const trackingUploadProperties: TrackingPlan.UploadProperties = {
    file_upload_id: analyticsService.getTrackingActionId(),
    file_size: file.size,
    file_extension: file.type,
    parent_folder_id: file.parentFolderId,
    file_name: file.name,
    bandwidth: 0,
    band_utilization: 0,
    process_identifier: options.trackingParameters?.processIdentifier,
    is_multiple: options.trackingParameters?.isMultipleUpload,
    is_brave: isBrave,
  };
  try {
    analyticsService.trackFileUploadStarted(trackingUploadProperties);

    if (continueUploadOptions?.isRetriedUpload) {
      analyticsService.trackFileUploadRetried(trackingUploadProperties);
    }

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

    const analyticsCallbacks = {
      pauseUploadCallback: () => analyticsService.trackFileUploadPaused(trackingUploadProperties),
      resumeUploadCallback: () => analyticsService.trackFileUploadResumed(trackingUploadProperties),
    };

    const [promise, abort] = new Network(bridgeUser, bridgePass, encryptionKey).uploadFile(
      bucketId,
      {
        filecontent: file.content,
        filesize: file.size,
        progressCallback: (progress) => {
          updateProgressCallback(progress);
        },
      },
      continueUploadOptions,
      analyticsCallbacks,
    );

    options.abortCallback?.(abort?.abort);

    const fileId = await promise;

    const name = encryptFilename(file.name, file.parentFolderId);

    const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
    const fileEntry: StorageTypes.FileEntryByUuid = {
      id: fileId,
      type: file.type,
      size: file.size,
      name: name,
      plain_name: file.name,
      bucket: bucketId,
      folder_id: file.parentFolderId,
      encrypt_version: StorageTypes.EncryptionVersion.Aes03,
    };

    let response = await storageClient.createFileEntryByUuid(fileEntry);
    if (!response.thumbnails) {
      response = {
        ...response,
        thumbnails: [],
      };
    }

    const generatedThumbnail = await generateThumbnailFromFile(file, response.id, userEmail, options.isTeam);
    if (generatedThumbnail?.thumbnail) {
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

    if (!options.abortController?.signal.aborted) {
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
