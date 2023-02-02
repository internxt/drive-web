import storageThunks from '../../../store/slices/storage/storage.thunks';
import { DriveFileData, DriveItemData } from '../../types';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';

import FileViewer from './FileViewer';
import { sessionSelectors } from '../../../store/slices/session/session.selectors';
import downloadService from '../../services/download.service';
import { useState } from 'react';

interface FileViewerWrapperProps {
  file: DriveFileData | null;
  onClose: () => void;
  showPreview: boolean;
}

const FileViewerWrapper = ({ file, onClose, showPreview }: FileViewerWrapperProps): JSX.Element => {
  const isTeam = useAppSelector(sessionSelectors.isTeam);
  const dispatch = useAppDispatch();
  const onDownload = () => file && dispatch(storageThunks.downloadItemsThunk([file as DriveItemData]));
  const [updateProgress, setUpdateProgress] = useState(0);

  const downloader = file
    ? (abortController: AbortController) =>
        downloadService.fetchFileBlob(
          { ...file, bucketId: file.bucket },
          {
            updateProgressCallback: (progress) => setUpdateProgress(progress),
            isTeam,
            abortController,
          },
        )
    : null;

  console.log(updateProgress);

  return file && downloader ? (
    <FileViewer
      show={showPreview}
      file={file}
      onClose={onClose}
      onDownload={onDownload}
      downloader={downloader}
      progress={updateProgress}
    />
  ) : (
    <div className="hidden" />
  );
};

export default FileViewerWrapper;
