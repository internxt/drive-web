import { useEffect } from 'react';
import * as Unicons from '@iconscout/react-unicons';

import { FileExtensionGroup, fileExtensionPreviewableGroups } from '../../types/file-types';
import fileExtensionService from '../../services/file-extension.service';
import viewers from './viewers';
import { fileViewerActions } from '../../../store/slices/fileViewer';
import storageThunks from '../../../store/slices/storage/storage.thunks';
import i18n from '../../../i18n/services/i18n.service';
import { DriveFileData, DriveItemData } from '../../types';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';

interface FileViewerProps {
  file: DriveFileData | null;
  onClose: () => void;
}

export interface FormatFileViewerProps {
  file: DriveFileData | null;
  setIsLoading: (value: boolean) => void;
  isLoading: boolean;
}

const extensionsList = fileExtensionService.computeExtensionsLists(fileExtensionPreviewableGroups);

const FileViewer = (props: FileViewerProps) => {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector((state) => state.fileViewer.isLoading);
  const onCloseButtonClicked = () => props.onClose();
  const onDownloadButtonClicked = () =>
    props.file && dispatch(storageThunks.downloadItemsThunk([props.file as DriveItemData]));
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCloseButtonClicked();
    }
  };
  const viewerProps = {
    isLoading,
    file: props.file,
    setIsLoading: (value: boolean) => dispatch(fileViewerActions.setIsLoading(value)),
  };
  let isTypeAllowed = false;
  let fileExtensionGroup: number | null = null;

  for (const [groupKey, extensions] of Object.entries(extensionsList)) {
    isTypeAllowed = extensions.includes(props.file?.type || '');

    if (isTypeAllowed) {
      fileExtensionGroup = FileExtensionGroup[groupKey];
      break;
    }
  }

  useEffect(() => {
    document.addEventListener('keyup', onKeyUp, false);

    return () => {
      document.removeEventListener('keyup', onKeyUp, false);
    };
  }, []);

  return (
    <div
      className="absolute z-50 top-0 left-0 right-0 bottom-0 bg-black bg-opacity-80 flex flex-col"
      onClick={onCloseButtonClicked}
    >
      {/* HEADER */}
      <div className="flex justify-between px-8 py-3">
        <div className="flex text-white">
          <button className="h-6 w-6" onClick={onCloseButtonClicked}>
            <Unicons.UilTimes />
          </button>
        </div>
        <div className="flex text-white">
          <button className="h-6 w-6" onClick={onDownloadButtonClicked}>
            <Unicons.UilFileDownload />
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="h-full flex justify-center items-center">
        {isTypeAllowed ? (
          <div onClick={(e) => e.stopPropagation()}>
            {viewers[fileExtensionGroup as FileExtensionGroup](viewerProps)}
          </div>
        ) : (
          <div className="text-white py-4 px-8 rounded-lg bg-m-neutral-400 shadow-lg">
            {i18n.get('error.noFilePreview')}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileViewer;
