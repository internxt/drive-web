import {
  canFileBeCached,
  getDatabaseFileSourceData,
  updateDatabaseFileSourceData,
} from 'app/drive/services/database.service';
import downloadService from 'app/drive/services/download.service';
import { convertibleImageExtensions } from 'app/drive/types/file-types';
import { PreviewFileItem } from 'app/share/types';
import dateService from 'services/date.service';

const CONVERTIBLE_IMAGE_DOWNLOAD_PROGRESS_SHARE = 0.95;

interface FilePreviewContentOptions {
  isWorkspace: boolean;
  abortController: AbortController;
  onProgress: (progress: number) => void;
}

export enum FilePreviewContentSource {
  Cache = 'cache',
  Download = 'download',
}

export interface FilePreviewContent {
  blob: Blob;
  source: FilePreviewContentSource;
}

const isConvertibleImage = (file: PreviewFileItem): boolean =>
  convertibleImageExtensions.includes(file.type.toLowerCase());

const downloadFileBlob = (
  file: PreviewFileItem,
  { isWorkspace, abortController, onProgress }: FilePreviewContentOptions,
): Promise<Blob> => {
  const progressShare = isConvertibleImage(file) ? CONVERTIBLE_IMAGE_DOWNLOAD_PROGRESS_SHARE : 1;

  return downloadService.fetchFileBlob(
    { ...file, bucketId: file.bucket },
    {
      updateProgressCallback: (progress) => onProgress(progress * progressShare),
      isWorkspace,
      abortController,
    },
    file.credentials,
    file.mnemonic,
  );
};

export const getFilePreviewContent = async (
  file: PreviewFileItem,
  options: FilePreviewContentOptions,
): Promise<FilePreviewContent> => {
  const cachedFile = await getDatabaseFileSourceData({ fileId: file.id });
  const isCacheUpToDate =
    !!cachedFile?.updatedAt && !dateService.isDateOneBefore({ dateOne: cachedFile.updatedAt, dateTwo: file.updatedAt });

  if (cachedFile && isCacheUpToDate) {
    return { blob: cachedFile.source as Blob, source: FilePreviewContentSource.Cache };
  }

  const blob = await downloadFileBlob(file, options);

  if (cachedFile || canFileBeCached(file)) {
    await updateDatabaseFileSourceData({
      fileId: file.id,
      folderId: file.folderId,
      sourceBlob: blob,
      updatedAt: file.updatedAt,
    });
  }

  return { blob, source: FilePreviewContentSource.Download };
};
