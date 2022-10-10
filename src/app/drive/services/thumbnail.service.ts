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
import { pdfjs } from 'react-pdf';

export interface ThumbnailToUpload {
  fileId: number;
  size: number;
  max_width: number;
  max_height: number;
  type: string;
  content: File;
}

interface ThumbnailGenerated {
  file: File | null,
  max_width: number;
  max_height: number;
  type: string
}

const getImageThumbnail = (file: File): Promise<ThumbnailGenerated['file']> => {
  return new Promise((resolve) => {
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

const getPDFThumbnail = async (file: File): Promise<ThumbnailGenerated['file']> => {
  const loadingTask = pdfjs.getDocument(await file.arrayBuffer());
  const pdfDocument = await loadingTask.promise;
  const page = await pdfDocument.getPage(1);
  const viewport = page.getViewport({ scale: 1.0 });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const canvasContext = canvas.getContext('2d', { alpha: false });

  if (canvasContext) {
    const renderTask = page.render({ canvasContext, viewport });
    await renderTask.promise;
    return new Promise((resolve) => {
      // Convert the canvas to an image buffer.
      canvas.toBlob((blob: Blob | null) => {
        if (blob) {
          resolve(new File([blob], ''));
        } else {
          resolve(null);
        }
      });
    });
  }
  return null;
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
    max_width: thumbnailToUpload.max_width,
    max_height: thumbnailToUpload.max_height,
    type: thumbnailToUpload.type,
    size: thumbnailToUpload.size,
    bucket_id: bucketId,
    bucket_file: bucketFile,
    encrypt_version: StorageTypes.EncryptionVersion.Aes03,
  };

  return await storageClient.createThumbnailEntry(thumbnailEntry);
};

export const getThumbnailFrom = async (fileToUpload: FileToUpload): Promise<ThumbnailGenerated> => {
  let thumbnailFile: File | null = null;
  if (thumbnailableImageExtension.includes(fileToUpload.type)) {
    thumbnailFile = await getImageThumbnail(fileToUpload.content);
  } else if (thumbnailablePdfExtension.includes(fileToUpload.type)) {
    const firstPDFpageImage = await getPDFThumbnail(fileToUpload.content);
    if (firstPDFpageImage) {
      thumbnailFile = await getImageThumbnail(firstPDFpageImage);
    }
  }
  return {
    file: thumbnailFile,
    type: String(ThumbnailConfig.Type),
    max_width: Number(ThumbnailConfig.MaxWidth),
    max_height: Number(ThumbnailConfig.MaxHeight)
  };
};

export const generateThumbnailFromFile = async (
  fileToUpload: FileToUpload,
  fileId: number,
  userEmail: string,
  isTeam: boolean): Promise<{ thumbnail: Thumbnail, thumbnailFile: File } | null> => {
  if (thumbnailableExtension.includes(fileToUpload.type)) {
    try {
      const thumbnail = await getThumbnailFrom(fileToUpload);

      if (thumbnail.file) {
        const thumbnailToUpload: ThumbnailToUpload = {
          fileId: fileId,
          size: thumbnail.file.size,
          max_width: thumbnail.max_width,
          max_height: thumbnail.max_height,
          type: thumbnail.type,
          content: thumbnail.file
        };
        const updateProgressCallback = () => { return; };
        const abortController = new AbortController();

        const thumbnailUploaded = await uploadThumbnail(userEmail, thumbnailToUpload, isTeam, updateProgressCallback, abortController);

        return {
          thumbnail: thumbnailUploaded,
          thumbnailFile: thumbnail.file
        };
      }
    } catch (error) { console.log(error); };
  }
  return null;
};

export const downloadThumbnail = async (thumbnailToDownload: Thumbnail, isTeam: boolean): Promise<Blob> => {
  const updateProgressCallback = () => { return; };
  const abortController = new AbortController();
  return await fetchFileBlob(
    { fileId: thumbnailToDownload.bucket_file, bucketId: thumbnailToDownload.bucket_id } as Downloadable,
    { isTeam, updateProgressCallback, abortController }
  );
};

export const setCurrentThumbnail = (thumbnailBlob: Blob, newThumbnail: Thumbnail, item: DriveItemData, dispatch: AppDispatch): void => {
  const currentThumbnail = Object.assign({}, newThumbnail);
  currentThumbnail.urlObject = URL.createObjectURL(thumbnailBlob);

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

export const compareThumbnail = (thumbnail: Thumbnail, compareTo: ThumbnailGenerated): boolean => {
  return (Number(thumbnail.size) === Number(compareTo.file?.size)
    && String(thumbnail.type) === String(compareTo.type)
    && (Number(thumbnail.max_width)) === (Number(compareTo.max_width))
    && (Number(thumbnail.max_height)) === (Number(compareTo.max_height)));
};
