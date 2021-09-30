import { useEffect } from 'react';
import * as Unicons from '@iconscout/react-unicons';

import { DriveFileData } from '../../models/interfaces';
import i18n from '../../services/i18n.service';
import { FileExtensionGroup, fileExtensionPreviewableGroups } from '../../models/file-types';
import fileExtensionService from '../../services/file-extension.service';
import viewers from './viewers';

interface FileViewerProps {
  file: DriveFileData | null;
  onClose: () => void;
}

const extensionsList = fileExtensionService.computeExtensionsLists(fileExtensionPreviewableGroups);

const FileViewer = (props: FileViewerProps) => {
  const onCloseButtonClicked = () => props.onClose();
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCloseButtonClicked();
    }
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

  console.log('fileExtensionGroup: ', fileExtensionGroup);

  useEffect(() => {
    document.addEventListener('keyup', onKeyUp, false);

    return () => {
      document.removeEventListener('keyup', onKeyUp, false);
    };
  }, []);

  return (
    <div className="absolute z-50 top-0 left-0 right-0 bottom-0 bg-black bg-opacity-75 flex flex-col">
      {/* HEADER */}
      <div className="flex justify-between px-8 py-3">
        <div className="flex text-white">
          <button className="h-6 w-6" onClick={onCloseButtonClicked}>
            <Unicons.UilTimes />
          </button>
        </div>
        <div className="flex text-white">
          <button className="h-6 w-6">
            <Unicons.UilFileDownload />
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="h-full flex justify-center items-center">
        {isTypeAllowed ? (
          <div className="text-white">{viewers[fileExtensionGroup as FileExtensionGroup]()}</div>
        ) : (
          <div className="text-white p-4 rounded-lg bg-m-neutral-400">{i18n.get('error.noFilePreview')}</div>
        )}
      </div>
    </div>
  );
};

export default FileViewer;
