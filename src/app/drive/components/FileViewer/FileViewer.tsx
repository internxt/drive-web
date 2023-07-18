import { Suspense, Fragment, useState, useEffect, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import fileExtensionService from '../../services/file-extension.service';
import viewers from './viewers';
import UilImport from '@iconscout/react-unicons/icons/uil-import';
import UilMultiply from '@iconscout/react-unicons/icons/uil-multiply';
import { DriveFileData, DriveItemData } from 'app/drive/types';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { FileExtensionGroup, fileExtensionPreviewableGroups } from 'app/drive/types/file-types';
import iconService from 'app/drive/services/icon.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import TopBarActions from './components/TopBarActions';
import { useHotkeys } from 'react-hotkeys-hook';
import ShareItemDialog from 'app/share/components/ShareItemDialog/ShareItemDialog';
import { RootState } from 'app/store';
import { uiActions } from 'app/store/slices/ui';
import { setItemsToMove, storageActions } from '../../../store/slices/storage';
import { isLargeFile } from 'app/core/services/media.service';

interface FileViewerProps {
  file?: DriveFileData;
  onClose: () => void;
  onDownload: () => void;
  downloader: (abortController: AbortController) => Promise<Blob>;
  show: boolean;
  progress?: number;
  setCurrentFile?: (file: DriveFileData) => void;
  isAuthenticated: boolean;
  isShareView?: boolean;
}

export interface FormatFileViewerProps {
  blob: Blob;
  changeFile: (direction: string) => void;
}

const extensionsList = fileExtensionService.computeExtensionsLists(fileExtensionPreviewableGroups);

const DownloadFile = ({ onDownload, translate }) => (
  <div
    className={'z-10 mt-3 flex h-11 flex-shrink-0 flex-row items-center justify-end space-x-2 rounded-lg bg-primary'}
  >
    <button
      title={translate('actions.download')}
      onClick={onDownload}
      className="flex h-10 cursor-pointer flex-row items-center space-x-2 rounded-lg bg-white
                          bg-opacity-0 px-6 font-medium transition duration-50
                          ease-in-out hover:bg-opacity-10 focus:bg-opacity-5"
    >
      <UilImport size={20} />
      <span className="font-medium">{translate('actions.download')}</span>
    </button>
  </div>
);

const ESC_KEY_KEYBOARD_CODE = 27;

const FileViewer = ({
  file,
  onClose,
  onDownload,
  downloader,
  setCurrentFile,
  show,
  progress,
  isAuthenticated,
  isShareView,
}: FileViewerProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const [isErrorWhileDownloading, setIsErrorWhileDownloading] = useState<boolean>(false);
  const ItemIconComponent = iconService.getItemIcon(false, file?.type);
  const filename = file ? `${file.name}${file.type ? `.${file.type}` : ''}` : '';
  const dirtyName = useAppSelector((state: RootState) => state.ui.currentEditingNameDirty);
  const isMoveItemsDialogOpen = useAppSelector((state: RootState) => state.ui.isMoveItemsDialogOpen);
  const isCreateFolderDialogOpen = useAppSelector((state: RootState) => state.ui.isCreateFolderDialogOpen);
  const isEditNameDialogOpen = useAppSelector((state: RootState) => state.ui.isEditFolderNameDialog);
  const isShareItemSettingsDialogOpen = useAppSelector((state) => state.ui.isShareItemDialogOpenInPreviewView);

  // Get all files in the current folder, sort the files and find the current file to display the file
  const currentItemsFolder = useAppSelector((state) => state.storage.levels[file?.folderId || '']);
  const folderFiles = useMemo(() => currentItemsFolder?.filter((item) => !item.isFolder), [currentItemsFolder]);

  // ESTO
  const sortFolderFiles = useMemo(() => {
    if (folderFiles) {
      return folderFiles.sort((a, b) => {
        if (a.name < b.name) {
          return -1;
        }
        if (a.name > b.name) {
          return 1;
        }
        return 0;
      });
    }
    return [];
  }, [folderFiles]);
  const totalFolderIndex = sortFolderFiles?.length;
  const fileIndex = sortFolderFiles?.findIndex((item) => item.id === file?.id);

  // To prevent close FileViewer if any of those modal are open
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.keyCode === ESC_KEY_KEYBOARD_CODE) {
        if (isMoveItemsDialogOpen || isCreateFolderDialogOpen || isEditNameDialogOpen || isShareItemSettingsDialogOpen)
          event.preventDefault();

        if (isShareItemSettingsDialogOpen) {
          dispatch(uiActions.setIsShareItemDialogOpenInPreviewView(false));
          dispatch(storageActions.setItemToShare(null));
          return;
        }

        if (isEditNameDialogOpen) {
          dispatch(storageActions.setItemToRename(null));
          dispatch(uiActions.setIsEditFolderNameDialog(false));
          return;
        }

        if (isCreateFolderDialogOpen) {
          dispatch(uiActions.setIsCreateFolderDialogOpen(false));
          return;
        }
        if (isMoveItemsDialogOpen) {
          dispatch(uiActions.setIsMoveItemsDialogOpen(false));
          dispatch(setItemsToMove([]));
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMoveItemsDialogOpen, isCreateFolderDialogOpen, isEditNameDialogOpen, isShareItemSettingsDialogOpen]);

  useEffect(() => {
    if (dirtyName) {
      setBlob(null);
      setCurrentFile?.(currentItemsFolder?.find((item) => item.name === dirtyName) as DriveFileData);
    }
    dispatch(uiActions.setCurrentEditingNameDirty(''));
  }, [dirtyName, file]);

  let isTypeAllowed = false;
  let fileExtensionGroup: number | null = null;

  for (const [groupKey, extensions] of Object.entries(extensionsList)) {
    isTypeAllowed = extensions.includes(file && file.type ? String(file.type).toLowerCase() : '');

    if (isTypeAllowed) {
      fileExtensionGroup = FileExtensionGroup[groupKey];
      break;
    }
  }

  const Viewer = isTypeAllowed ? viewers[fileExtensionGroup as FileExtensionGroup] : undefined;

  const [blob, setBlob] = useState<Blob | null>(null);

  //Switch to the next or previous file in the folder
  function changeFile(direction: 'next' | 'prev') {
    setBlob(null);
    if (direction === 'next') {
      setCurrentFile?.(sortFolderFiles[fileIndex + 1]);
    } else {
      setCurrentFile?.(sortFolderFiles[fileIndex - 1]);
    }
  }

  //UseHotKeys for switch between files with the keyboard (left and right arrows)
  useHotkeys(
    'right',
    () => changeFile('next'),
    {
      enabled: fileIndex !== totalFolderIndex - 1,
    },
    [fileIndex, totalFolderIndex],
  );

  useHotkeys(
    'left',
    () => changeFile('prev'),
    {
      enabled: fileIndex !== 0,
    },
    [fileIndex],
  );

  const dispatch = useAppDispatch();

  const largeFile = file && isLargeFile(file.size);

  useEffect(() => {
    if (show && isTypeAllowed) {
      if (
        (fileExtensionGroup === FileExtensionGroup.Audio && !largeFile) ||
        (fileExtensionGroup === FileExtensionGroup.Video && !largeFile)
      ) {
        setIsErrorWhileDownloading(true);
        return;
      }
      downloader(new AbortController())
        .then((blob) => {
          setBlob(blob);
          setIsErrorWhileDownloading(false);
        })
        .catch((err) => {
          // TODO
          setIsErrorWhileDownloading(true);
        });
    } else {
      setBlob(null);
      setIsErrorWhileDownloading(true);
    }
  }, [show, file]);

  return (
    <Transition
      show={show}
      appear
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
        className="hide-scroll fixed inset-0 z-50 flex flex-col items-center justify-start text-white"
        onClose={onClose}
      >
        <div className="flex h-screen w-screen flex-col items-center justify-center">
          {/* Close overlay */}
          <Dialog.Overlay
            className="fixed inset-0 bg-black bg-opacity-85 backdrop-blur-md
                                    backdrop-filter"
          />

          {/* Content */}
          <>
            {file && <ShareItemDialog share={file?.shares?.[0]} isPreviewView item={file as DriveItemData} />}
            {fileIndex === 0 ? null : (
              <button
                title={translate('actions.previous')}
                className="outline-none absolute top-1/2 left-10 z-30 rounded-full bg-black p-4 text-white"
                onClick={() => changeFile('prev')}
              >
                <CaretLeft size={24} />
              </button>
            )}

            {isTypeAllowed && !isErrorWhileDownloading ? (
              <div
                tabIndex={0}
                className="outline-none z-10 flex max-h-full max-w-full flex-col items-start justify-start overflow-auto"
              >
                <div onClick={(e) => e.stopPropagation()} className="">
                  {blob && file ? (
                    <Suspense fallback={<div></div>}>
                      <Viewer
                        blob={blob}
                        changeFile={changeFile}
                        file={file}
                        setIsErrorWhileDownloading={setIsErrorWhileDownloading}
                      />
                    </Suspense>
                  ) : (
                    <>
                      <div
                        tabIndex={0}
                        className={`${
                          progress === 1 ? 'hidden' : 'flex'
                        } outline-none pointer-events-none z-10 select-none flex-col items-center justify-center
                      rounded-xl font-medium`}
                      >
                        <ItemIconComponent className="mr-3 flex" width={60} height={80} />
                        <span className="w-96 truncate text-center text-lg">{filename}</span>
                        <span className="text-white text-opacity-50">{translate('drive.loadingFile')}</span>
                        <div className="mt-8 h-1.5 w-56 rounded-full bg-white bg-opacity-25">
                          <div
                            className="h-1.5 rounded-full bg-white"
                            style={{ width: `${progress !== undefined && Number(progress) ? progress * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div
                tabIndex={0}
                className="outline-none z-10 flex select-none flex-col items-center justify-center
                      space-y-6 rounded-xl font-medium"
              >
                <div className="flex flex-col items-center justify-center">
                  <ItemIconComponent className="flex" width={80} height={80} />
                  <span className="w-96 truncate pt-2 text-center text-lg">{filename}</span>
                  <span className="text-white text-opacity-50">{translate('error.noFilePreview')}</span>
                </div>
                <div>
                  <DownloadFile onDownload={onDownload} translate={translate} />
                </div>
              </div>
            )}
            {fileIndex === totalFolderIndex - 1 ? null : (
              <button
                title={translate('actions.next')}
                className="outline-none absolute top-1/2 right-10 z-30 rounded-full bg-black p-4 text-white"
                onClick={() => changeFile('next')}
              >
                <CaretRight size={24} />
              </button>
            )}
          </>

          {/* Background */}
          <div
            className="pointer-events-none fixed -inset-x-20 -top-6 z-10 h-16 bg-black
                          blur-2xl filter"
          />

          {/* Top bar controls */}
          <div
            className="fixed inset-x-0 top-0 z-20 flex h-0 w-screen max-w-full select-none flex-row
                          items-start justify-between px-4 text-lg font-medium"
          >
            {/* Close and title */}
            <div className="mt-3 mr-6 flex h-10 flex-row items-center justify-start space-x-4 truncate md:mr-32">
              <button
                onClick={onClose}
                className="group relative flex h-10 w-10 flex-shrink-0 flex-col items-center justify-center rounded-full
                                bg-white bg-opacity-0 transition duration-50 ease-in-out
                                hover:bg-opacity-10 focus:bg-opacity-5"
              >
                <UilMultiply height={24} width={24} />
              </button>

              <Dialog.Title className="flex w-11/12 flex-row items-center text-lg">
                <ItemIconComponent className="mr-3" width={32} height={32} />
                <p className="w-full truncate">{filename}</p>
              </Dialog.Title>
            </div>

            {/* Top bar buttons */}
            <TopBarActions
              onDownload={onDownload}
              file={file as DriveItemData}
              isAuthenticated={isAuthenticated}
              isShareView={isShareView}
            />
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default FileViewer;
