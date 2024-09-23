import { useEffect, useState } from 'react';
import errorService from 'app/core/services/error.service';
import { getFileContentManager } from 'app/drive/components/FileViewer/utils/fileViewerWrapperUtils';
import downloadService from 'app/drive/services/download.service';
import { PreviewFileItem } from 'app/share/types';
import { AppDispatch } from 'app/store';
import { uiActions } from 'app/store/slices/ui';
import { handleFileThumbnail } from '../utils/handleThumbnails';

const SPECIAL_MIME_TYPES = ['heic'];

export const useFileViewerDownload = ({
  currentFile,
  isWorkspace,
  dispatch,
}: {
  currentFile: PreviewFileItem;
  isWorkspace: boolean;
  dispatch: AppDispatch;
}) => {
  const [isDownloadStarted, setIsDownloadStarted] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<number | undefined>(0);
  const [blob, setBlob] = useState<Blob | null>(null);

  function handleProgress(progress: number, fileType?: string) {
    if (fileType && SPECIAL_MIME_TYPES.includes(fileType)) {
      setUpdateProgress(progress * 0.95);
    } else {
      setUpdateProgress(progress);
    }
  }

  function downloadFile(currentFile: PreviewFileItem, abortController: AbortController) {
    setBlob(null);
    return downloadService.fetchFileBlob(
      { ...currentFile, bucketId: currentFile.bucket },
      {
        updateProgressCallback: (progress) => handleProgress(progress, currentFile.type.toLowerCase()),
        isWorkspace,
        abortController,
      },
      currentFile.credentials,
      currentFile.mnemonic,
    );
  }

  const fileContentManager = getFileContentManager(currentFile, downloadFile);

  const onChangeFile = () => {
    if (isDownloadStarted) {
      fileContentManager.abort();
    }

    setBlob(null);
    setUpdateProgress(0);
    setIsDownloadStarted(false);
  };

  const downloadFileBlob = async () => {
    try {
      const { blob, shouldHandleFileThumbnail } = await fileContentManager.download();

      setBlob(blob);
      if (shouldHandleFileThumbnail) {
        handleFileThumbnail(currentFile, blob, dispatch).catch(errorService.reportError);
      }
    } catch (error) {
      if ((error as any).name === 'AbortError') {
        return;
      }
      console.error(error);
      setBlob(null);
      errorService.reportError(error);
    } finally {
      setIsDownloadStarted(false);
      setUpdateProgress(undefined);
    }
  };

  useEffect(() => {
    dispatch(uiActions.setFileViewerItem(currentFile));
    if (currentFile && !updateProgress && !isDownloadStarted) {
      setUpdateProgress(0);
      setIsDownloadStarted(true);
      downloadFileBlob();
    }
  }, [currentFile]);

  return { blob, updateProgress, abortDownload: onChangeFile, handleProgress, setBlob };
};
