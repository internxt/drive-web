import { Suspense, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { FileExtensionGroup, fileExtensionPreviewableGroups } from '../../types/file-types';
import fileExtensionService from '../../services/file-extension.service';
import viewers from './viewers';
import { fileViewerActions } from '../../../store/slices/fileViewer';
import storageThunks from '../../../store/slices/storage/storage.thunks';
import i18n from '../../../i18n/services/i18n.service';
import { DriveFileData, DriveItemData } from '../../types';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';

import UilImport from '@iconscout/react-unicons/icons/uil-import';
import UilMultiply from '@iconscout/react-unicons/icons/uil-multiply';

interface FileViewerProps {
  file: DriveFileData | null;
  onClose: () => void;
  show: boolean;
}

export interface FormatFileViewerProps {
  file: DriveFileData | null;
  setIsLoading: (value: boolean) => void;
  isLoading: boolean;
}

const extensionsList = fileExtensionService.computeExtensionsLists(fileExtensionPreviewableGroups);

const FileViewer = (props: FileViewerProps): JSX.Element => {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector((state) => state.fileViewer.isLoading);
  const onClose = () =>
    props.onClose();
  const onDownload = () =>
    props.file && dispatch(storageThunks.downloadItemsThunk([props.file as DriveItemData]));
  const viewerProps = {
    isLoading,
    file: props.file,
    setIsLoading: (value: boolean) => dispatch(fileViewerActions.setIsLoading(value))
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

  const Viewer = isTypeAllowed ? viewers[fileExtensionGroup as FileExtensionGroup] : undefined;

  return (
    <Transition
      appear
      show={props.show}
      as={Fragment}
      enter="ease-out duration-150"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="ease-in duration-100"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <Dialog
        as="div"
        className="fixed flex flex-col items-center justify-start inset-0 z-50 text-white hide-scroll"
        onClose={onClose}
      >
        <div className="h-screen w-screen flex flex-col items-center justify-center">

          {/* Close overlay */}
          <Dialog.Overlay className="fixed inset-0 bg-cool-gray-100 bg-opacity-90 backdrop-filter
                                    backdrop-blur-md" />

          {/* Content */}
          {isTypeAllowed ? (
            <div
              tabIndex={0}
              className="flex flex-col justify-start items-start z-10 outline-none max-w-full max-h-full overflow-auto"
            >
                <div onClick={(e) => e.stopPropagation()} className="" >
                  <Suspense fallback={<div></div>}>
                    <Viewer {...viewerProps} />
                  </Suspense>
                </div>
            </div>
            
          ) : (
            <div
              tabIndex={0}
              className="flex flex-row items-center justify-center h-12 px-6 bg-white bg-opacity-5 font-medium
                          rounded-xl z-10 pointer-events-none outline-none space-x-2 select-none"
            >
              <span>{i18n.get('error.noFilePreview')}</span>
            </div>
          )}

          {/* Background */}
          <div className="fixed -top-6 -inset-x-20 h-16 bg-cool-gray-100 z-10 pointer-events-none
                          filter blur-2xl" />

          {/* Top bar controls */}
          <div className="fixed top-0 left-0 w-screen h-0 flex flex-row items-start justify-between px-4 z-20
                          select-none text-lg font-medium">
            
            {/* Close and title */}
            <div className="flex flex-row items-center justify-start h-10 mt-3 space-x-4 z-10">
              <button
                onClick={onClose}
                className="relative group flex flex-col items-center justify-center h-10 w-10 bg-white bg-opacity-0
                                hover:bg-opacity-10 focus:bg-opacity-5 transition duration-50 ease-in-out
                                rounded-full">
                <UilMultiply height="20" width="20" />
              </button>

              <Dialog.Title>{props.file && `${props.file.name}.${props.file.type}`}</Dialog.Title>
            </div>

            {/* Download button */}
            <div className="flex flex-row items-center justify-end h-10 mt-3 space-x-4 z-10">
              <button
                onClick={onDownload}
                className="flex flex-row items-center h-10 px-6 rounded-lg space-x-2 cursor-pointer
                          font-medium bg-white bg-opacity-0 hover:bg-opacity-10 focus:bg-opacity-5
                          transition duration-50 ease-in-out">
                <UilImport height="20" width="20" />
                <span className="font-medium">{i18n.get('actions.download')}</span>
              </button>
            </div>
          </div>
          
        </div>
      </Dialog>
    </Transition>
  );
};

export default FileViewer;
