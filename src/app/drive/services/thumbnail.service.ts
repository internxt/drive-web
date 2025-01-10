import { StorageTypes } from '@internxt/sdk/dist/drive';
import { Thumbnail } from '@internxt/sdk/dist/drive/storage/types';
import {
  thumbnailableExtension,
  thumbnailableImageExtension,
  thumbnailablePdfExtension,
} from 'app/drive/types/file-types';
import { Downloadable } from 'app/network/download';
import { uploadFile as uploadToBucket } from 'app/network/upload';
import { AppDispatch } from 'app/store';
import { storageActions } from 'app/store/slices/storage';
import Resizer from 'react-image-file-resizer';
import { pdfjs } from 'react-pdf';
import { SdkFactory } from '../../core/factory/sdk';
import errorService from '../../core/services/error.service';
import localStorageService from '../../core/services/local-storage.service';
import navigationService from '../../core/services/navigation.service';
import { AppView } from '../../core/types';
import notificationsService, { ToastType } from '../../notifications/services/notifications.service';
import { DriveItemData, ThumbnailConfig } from '../types';
import fetchFileBlob from './download.service/fetchFileBlob';
import { getEnvironmentConfig } from './network.service';
import { FileToUpload } from './file.service/types';

export interface ThumbnailToUpload {
  fileId: number;
  size: number;
  max_width: number;
  max_height: number;
  type: string;
  content: File;
}

interface ThumbnailGenerated {
  file: File | null;
  max_width: number;
  max_height: number;
  type: string;
}

const isValidImage = (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = URL.createObjectURL(file);
  });
};

const getImageThumbnail = async (file: File): Promise<ThumbnailGenerated['file']> => {
  const isValid = await isValidImage(file);
  if (!isValid) {
    return null;
  }

  return new Promise((resolve) => {
    Resizer.imageFileResizer(
      file,
      ThumbnailConfig.MaxWidth,
      ThumbnailConfig.MaxHeight,
      ThumbnailConfig.Type,
      ThumbnailConfig.Quality,
      0,
      (uri) => {
        if (uri && uri instanceof File) resolve(uri);
        else resolve(null);
      },
      'file',
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
    await loadingTask.destroy();
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
  abortController?: AbortController,
): Promise<Thumbnail> => {
  const { bridgeUser, bridgePass, encryptionKey, bucketId } = getEnvironmentConfig(isTeam);

  if (!bucketId) {
    notificationsService.show({ text: 'Login again to start uploading files', type: ToastType.Warning });
    localStorageService.clear();
    navigationService.push(AppView.Login);

    throw new Error('Bucket not found!');
  }

  const bucketFile = await uploadToBucket(bucketId, {
    creds: {
      pass: bridgePass,
      user: bridgeUser,
    },
    filecontent: thumbnailToUpload.content,
    filesize: thumbnailToUpload.size,
    mnemonic: encryptionKey,
    progressCallback: (totalBytes, uploadedBytes) => {
      updateProgressCallback(uploadedBytes / totalBytes);
    },
    abortController,
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

/**
 * Generates a thumbnail from the given file to upload.
 * @async
 * @function
 * @param {FileToUpload} fileToUpload - The file to generate the thumbnail from.
 * @returns {Promise<ThumbnailGenerated>} - A promise that returns the generated thumbnail.
 */
export const getThumbnailFrom = async (fileToUpload: FileToUpload): Promise<ThumbnailGenerated> => {
  let thumbnailFile: File | null = null;
  const fileType = fileToUpload.type ? String(fileToUpload.type).toLowerCase() : '';

  if (thumbnailableImageExtension.includes(fileType)) {
    thumbnailFile = await getImageThumbnail(fileToUpload.content);
  } else if (thumbnailablePdfExtension.includes(fileType)) {
    const firstPDFpageImage = await getPDFThumbnail(fileToUpload.content);

    if (firstPDFpageImage) {
      thumbnailFile = await getImageThumbnail(firstPDFpageImage);
    }
  }

  return {
    file: thumbnailFile,
    type: String(ThumbnailConfig.Type),
    max_width: Number(ThumbnailConfig.MaxWidth),
    max_height: Number(ThumbnailConfig.MaxHeight),
  };
};

export const generateThumbnailFromFile = async (
  fileToUpload: FileToUpload,
  fileId: number,
  userEmail: string,
  isTeam: boolean,
): Promise<{ thumbnail: Thumbnail; thumbnailFile: File } | null> => {
  const fileType = fileToUpload.type ? String(fileToUpload.type).toLowerCase() : '';
  if (thumbnailableExtension.includes(fileType)) {
    try {
      const thumbnail = await getThumbnailFrom(fileToUpload);

      if (thumbnail.file) {
        const thumbnailToUpload: ThumbnailToUpload = {
          fileId: fileId,
          size: thumbnail.file.size,
          max_width: thumbnail.max_width,
          max_height: thumbnail.max_height,
          type: thumbnail.type,
          content: thumbnail.file,
        };
        const updateProgressCallback = () => {
          return;
        };
        const abortController = new AbortController();

        const thumbnailUploaded = await uploadThumbnail(
          userEmail,
          thumbnailToUpload,
          isTeam,
          updateProgressCallback,
          abortController,
        );

        return {
          thumbnail: thumbnailUploaded,
          thumbnailFile: thumbnail.file,
        };
      }
    } catch (error) {
      errorService.reportError(error);
    }
  }
  return null;
};

export const downloadThumbnail = async (thumbnailToDownload: Thumbnail, isWorkspace: boolean): Promise<Blob> => {
  const updateProgressCallback = () => {
    return;
  };
  const abortController = new AbortController();
  // TODO: CHECK WHY WITH THUMBNAILS NOT HAS TO USE WORKSPACE CREDENTIALS
  return await fetchFileBlob(
    { fileId: thumbnailToDownload.bucket_file, bucketId: thumbnailToDownload.bucket_id } as Downloadable,
    { isWorkspace: false, updateProgressCallback, abortController },
  );
};

export const setCurrentThumbnail = (
  thumbnailBlob: Blob,
  newThumbnail: Thumbnail,
  item: DriveItemData,
  dispatch: AppDispatch,
): void => {
  const currentThumbnail = Object.assign({}, newThumbnail);
  currentThumbnail.urlObject = URL.createObjectURL(thumbnailBlob);

  dispatch(
    storageActions.patchItem({
      uuid: item.uuid,
      folderId: item.isFolder ? item.parentUuid : item.folderUuid,
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
      uuid: item.uuid,
      folderId: item.isFolder ? item.parentUuid : item.folderUuid,
      isFolder: item.isFolder,
      patch: {
        thumbnails: thumbnails,
      },
    }),
  );
};

/**
 * Compares two thumbnails to determine if they are the same
 * @function
 * @param {Thumbnail} thumbnail - Thumbnail to compare.
 * @param {ThumbnailGenerated} compareTo - Thumbnail being compared to.
 * @returns {boolean} Returns true if both thumbnails are the same.
 */
export const compareThumbnail = (thumbnail: Thumbnail, compareTo: ThumbnailGenerated): boolean => {
  return (
    Number(thumbnail.size) === Number(compareTo.file?.size) &&
    String(thumbnail.type) === String(compareTo.type) &&
    Number(thumbnail.max_width) === Number(compareTo.max_width) &&
    Number(thumbnail.max_height) === Number(compareTo.max_height)
  );
};
