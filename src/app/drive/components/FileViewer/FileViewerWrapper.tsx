import storageThunks from '../../../store/slices/storage/storage.thunks';
import { DriveFileData, DriveItemData } from '../../types';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';

import FileViewer from './FileViewer';
import { sessionSelectors } from '../../../store/slices/session/session.selectors';
import downloadService from '../../services/download.service';
import { useEffect, useState } from 'react';

interface FileViewerWrapperProps {
  file: DriveFileData | null;
  onClose: () => void;
  showPreview: boolean;
}

const FileViewerWrapper = ({ file, onClose, showPreview }: FileViewerWrapperProps): JSX.Element => {
  const isTeam = useAppSelector(sessionSelectors.isTeam);
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const dispatch = useAppDispatch();
  const onDownload = () => currentFile && dispatch(storageThunks.downloadItemsThunk([currentFile as DriveItemData]));

  const [updateProgress, setUpdateProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<DriveFileData>();

  function downloadFile(currentFile) {
    if (isTypeSupportedByVideoPlayer().includes(currentFile.type)) {
      videoService.loadVideoIntoPlayer(
        { ...currentFile, bucketId: currentFile.bucket },
        {
          updateProgressCallback: (progress) => setUpdateProgress(progress),
          isTeam,
          abortController,
        },
      );
    } else {
      (abortController: AbortController) =>
        downloadService.fetchFileBlob(
          { ...currentFile, bucketId: currentFile.bucket },
          {
            updateProgressCallback: (progress) => setUpdateProgress(progress),
            isTeam,
            abortController,
          },
        );
    }
  }

  useEffect(() => {
    file && setCurrentFile(file);
  }, [file]);

  const downloader = currentFile
    ? (abortController: AbortController) =>
        downloadService.fetchFileBlob(
          { ...currentFile, bucketId: currentFile.bucket },
          {
            updateProgressCallback: (progress) => setUpdateProgress(progress),
            isTeam,
            abortController,
          },
        )
    : null;

  return file && downloader ? (
    <FileViewer
      show={showPreview}
      file={currentFile}
      onClose={onClose}
      onDownload={onDownload}
      downloader={downloader}
      setCurrentFile={setCurrentFile}
      progress={updateProgress}
      isAuthenticated={isAuthenticated}
    />
  ) : (
    <div className="hidden" />
  );
};

export default FileViewerWrapper;
