import { StorageTypes } from '@internxt/sdk/dist/drive';
import { Thumbnail } from '@internxt/sdk/dist/drive/storage/types';
import {
  thumbnailableExtension,
  thumbnailableImageExtension,
  thumbnailablePdfExtension,
  thumbnailableVideoExtension,
} from 'app/drive/types/file-types';
import { Downloadable } from 'app/network/download';
import { uploadFile as uploadToBucket } from 'app/network/upload';
import { AppDispatch } from 'app/store';
import { storageActions } from 'app/store/slices/storage';
import Resizer from 'react-image-file-resizer';
import { pdfjs } from 'react-pdf';
import { SdkFactory } from 'app/core/factory/sdk';
import errorService from 'services/error.service';
import localStorageService from 'services/local-storage.service';
import navigationService from 'services/navigation.service';
import { AppView } from 'app/core/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { DriveItemData, ThumbnailConfig } from '../types';
import fetchFileBlob from './download.service/fetchFileBlob';
import { getEnvironmentConfig } from './network.service';
import { FileToUpload } from './file.service/types';
import { ErrorLoadingVideoFileError } from './errors/thumbnail.service.errors';

export interface ThumbnailToUpload {
  fileId: string;
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

const VIDEO_FRAME_QUALITY = 0.75;

export const isValidImage = (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = URL.createObjectURL(file);
  });
};

export const getImageThumbnail = async (file: File): Promise<ThumbnailGenerated['file']> => {
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

export const generateThumbnailBlob = (video: HTMLVideoElement, onBlob: (blob: Blob | null) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    onBlob(null);
    return;
  }

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  canvas.toBlob((blob) => onBlob(blob), 'image/jpeg', VIDEO_FRAME_QUALITY);
};

export const getVideoFrame = async (file: File): Promise<ThumbnailGenerated['file']> => {
  let seekTo = 5;

  const onSeekEvent = (videoPlayer: HTMLVideoElement, resolve: (file: File | null) => void) => {
    generateThumbnailBlob(videoPlayer, (blob) => {
      resolve(blob ? new File([blob], '') : null);
    });
  };

  const onLoadMetadata = (
    videoPlayer: HTMLVideoElement,
    resolve: (file: File | null) => void,
    reject: (error: Error) => void,
  ) => {
    if (videoPlayer.duration < seekTo) {
      seekTo = videoPlayer.duration / 2;
    }

    videoPlayer.currentTime = seekTo;

    videoPlayer.addEventListener('seeked', () => onSeekEvent(videoPlayer, resolve));
  };

  return new Promise((resolve, reject) => {
    const videoPlayer = document.createElement('video');
    videoPlayer.setAttribute('src', URL.createObjectURL(file));
    videoPlayer.load();
    videoPlayer.addEventListener('error', () => {
      reject(new ErrorLoadingVideoFileError());
    });

    videoPlayer.addEventListener('loadedmetadata', () => onLoadMetadata(videoPlayer, resolve, reject));
  });
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

  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  const thumbnailEntry: StorageTypes.CreateThumbnailEntryPayload = {
    bucketFile,
    bucketId,
    encryptVersion: StorageTypes.EncryptionVersion.Aes03,
    fileUuid: thumbnailToUpload.fileId,
    maxHeight: thumbnailToUpload.max_height,
    maxWidth: thumbnailToUpload.max_width,
    size: thumbnailToUpload.size,
    type: thumbnailToUpload.type,
  };

  return await storageClient.createThumbnailEntryWithUUID(thumbnailEntry);
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
  } else if (thumbnailableVideoExtension.includes(fileType)) {
    const videoFrame = await getVideoFrame(fileToUpload.content);
    if (videoFrame) {
      thumbnailFile = await getImageThumbnail(videoFrame);
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
  fileId: string,
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
