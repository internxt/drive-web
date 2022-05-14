import storageThunks from '../../../store/slices/storage/storage.thunks';
import { DriveFileData, DriveItemData } from '../../types';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';

import FileViewer from './FileViewer';
import { sessionSelectors } from '../../../store/slices/session/session.selectors';
import downloadService from '../../services/download.service';

interface FileViewerWrapperProps {
  file: DriveFileData | null;
  onClose: () => void;
  showPreview: boolean;
}

const FileViewerWrapper = ({ file, onClose, showPreview }: FileViewerWrapperProps): JSX.Element => {
  const isTeam = useAppSelector(sessionSelectors.isTeam);
  const dispatch = useAppDispatch();
  const onDownload = () => file && dispatch(storageThunks.downloadItemsThunk([file as DriveItemData]));

  const downloader = file
    ? (abortController: AbortController) => 
        downloadService.fetchFileBlob({ ...file, bucketId: file.bucket }, {
          updateProgressCallback: () => undefined,
          isTeam,
          abortController
        })
    : null;

  return file && downloader ? (
    <FileViewer show={showPreview} file={file} onClose={onClose} onDownload={onDownload} downloader={downloader} />
  ) : (
    <div className="hidden" />
  );
};

export default FileViewerWrapper;
