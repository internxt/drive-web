import { StorageTypes } from '@internxt/sdk/dist/drive';
import analyticsService from '../../analytics/services/analytics.service';
import { AppView, DevicePlatform } from '../../core/types';
import localStorageService from '../../core/services/local-storage.service';
import navigationService from '../../core/services/navigation.service';
import { getEnvironmentConfig } from './network.service';
import { SdkFactory } from '../../core/factory/sdk';
import { uploadFile as uploadToBucket } from 'app/network/upload';
import notificationsService, { ToastType } from '../../notifications/services/notifications.service';
import { Thumbnail } from '@internxt/sdk/dist/drive/storage/types';
import { thumbnailableExtension, thumbnailableImageExtension, thumbnailablePdfExtension } from 'app/drive/types/file-types';
import { FileToUpload } from './file.service/uploadFile';
import Resizer from 'react-image-file-resizer';
import { DriveItemData, ThumbnailConfig } from '../types';
import fetchFileBlob from './download.service/fetchFileBlob';
import { Downloadable } from 'app/network/download';
import { storageActions } from 'app/store/slices/storage';
import { AppDispatch } from 'app/store';


export interface ThumbnailToUpload {
  fileId: number;
  size: number;
  type: string;
  content: File;
}

const getImageThumbnail = async (file: File): Promise<File | null> => {
  return await new Promise((resolve) => {
    Resizer.imageFileResizer(
      file,
      ThumbnailConfig.MaxWidth,
      ThumbnailConfig.MaxHeight,
      ThumbnailConfig.Type,
      ThumbnailConfig.Quality,
      0,
      (uri) => {
        if (uri && uri instanceof File)
          resolve(uri);
        else
          resolve(null);
      },
      'file'
    );
  });
};

export const uploadThumbnail = async (
  userEmail: string,
  thumbnailToUpload: ThumbnailToUpload,
  isTeam: boolean,
  updateProgressCallback: (progress: number) => void,
  abortController?: AbortController
): Promise<Thumbnail> => {
  const { bridgeUser, bridgePass, encryptionKey, bucketId } = getEnvironmentConfig(isTeam);

  if (!bucketId) {
    analyticsService.trackFileUploadBucketIdUndefined({ email: userEmail, platform: DevicePlatform.Web });
    notificationsService.show({ text: 'Login again to start uploading files', type: ToastType.Warning });
    localStorageService.clear();
    navigationService.push(AppView.Login);

    throw new Error('Bucket not found!');
  }

  const bucketFile = await uploadToBucket(bucketId, {
    creds: {
      pass: bridgePass,
      user: bridgeUser
    },
    filecontent: thumbnailToUpload.content,
    filesize: thumbnailToUpload.size,
    mnemonic: encryptionKey,
    progressCallback: (totalBytes, uploadedBytes) => {
      updateProgressCallback(uploadedBytes / totalBytes);
    },
    abortController
  });

  const storageClient = SdkFactory.getInstance().createStorageClient();
  const thumbnailEntry: StorageTypes.ThumbnailEntry = {
    file_id: thumbnailToUpload.fileId,
    type: thumbnailToUpload.type,
    size: thumbnailToUpload.size,
    bucket_id: bucketId,
    bucket_file: bucketFile,
    encrypt_version: StorageTypes.EncryptionVersion.Aes03,
  };

  return await storageClient.createThumbnailEntry(thumbnailEntry);
};

export const getThumbnailFrom = async (fileToUpload: FileToUpload): Promise<{ file: File | null, type: string }> => {
  const thumbnailType = ThumbnailConfig.MaxWidth + 'x' + ThumbnailConfig.MaxHeight + '.' + ThumbnailConfig.Type;
  let thumbnailFile: File | null = null;
  if (thumbnailableImageExtension.includes(fileToUpload.type)) {
    thumbnailFile = await getImageThumbnail(fileToUpload.content);
  } else if (thumbnailablePdfExtension.includes(fileToUpload.type)) {
    //thumbnailFile = await getPDFThumbnail(fileToUpload.content);
  }
  return { file: thumbnailFile, type: thumbnailType };
};

export const generateThumbnailFromFile = async (
  fileToUpload: FileToUpload,
  fileId: number,
  userEmail: string,
  isTeam: boolean): Promise<{ thumbnail: Thumbnail, currentThumbnail: File } | undefined> => {
  if (thumbnailableExtension.includes(fileToUpload.type)) {
    try {
      const thumbnail = await getThumbnailFrom(fileToUpload);

      if (thumbnail.file) {
        const thumbnailToUpload: ThumbnailToUpload = {
          fileId: fileId,
          size: thumbnail.file.size,
          type: thumbnail.type,
          content: thumbnail.file
        };
        const updateProgressCallback = () => { return; };
        const abortController = new AbortController();

        const thumbnailUploaded = await uploadThumbnail(userEmail, thumbnailToUpload, isTeam, updateProgressCallback, abortController);

        return {
          thumbnail: thumbnailUploaded,
          currentThumbnail: thumbnail.file
        };
      }
    } catch (error) { console.log(error); };
  }
};

export const downloadThumbnail = async (thumbnailToDownload: Thumbnail, isTeam: boolean): Promise<Blob> => {
  const updateProgressCallback = () => { return; };
  const abortController = new AbortController();
  return await fetchFileBlob(
    { fileId: thumbnailToDownload.bucket_file, bucketId: thumbnailToDownload.bucket_id } as Downloadable,
    { isTeam, updateProgressCallback, abortController }
  );
};

export const setCurrentThumbnail = (thumbnailBlob: Blob, item: DriveItemData, dispatch: AppDispatch): void => {
  const currentThumbnail = URL.createObjectURL(thumbnailBlob);
  dispatch(
    storageActions.patchItem({
      id: item.id,
      folderId: item.isFolder ? item.parentId : item.folderId,
      isFolder: item.isFolder,
      patch: {
        currentThumbnail: currentThumbnail,
      },
    }),
  );
};

export const setThumbnails = (thumbnails: Thumbnail[], item: DriveItemData, dispatch: AppDispatch): void => {
  dispatch(
    storageActions.patchItem({
      id: item.id,
      folderId: item.isFolder ? item.parentId : item.folderId,
      isFolder: item.isFolder,
      patch: {
        thumbnails: thumbnails,
      },
    }),
  );
};
