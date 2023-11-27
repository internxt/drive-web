import { Suspense, Fragment, useState, useEffect } from 'react';
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
import { TrackingPlan } from '../../../analytics/TrackingPlan';
import {
  trackFilePreviewed,
  trackFilePreviewOpened,
  trackFilePreviewClicked,
} from '../../../analytics/services/analytics.service';

interface FileViewerProps {
  file: DriveFileData;
  onClose: () => void;
  onDownload: () => void;
  show: boolean;
  isAuthenticated: boolean;
  progress?: number;
  isShareView?: boolean;
  blob?: Blob | null;
  setBlob?: (blob: Blob | null) => void;
  changeFile?;
  totalFolderIndex?;
  fileIndex?;
}

export interface FormatFileViewerProps {
  blob: Blob;
  changeFile: (direction: string) => void;
}

const extensionsList = fileExtensionService.computeExtensionsLists(fileExtensionPreviewableGroups);

function shouldNotBeRendered(fileExtensionGroup) {
  const allowedGroups = [FileExtensionGroup.Audio, FileExtensionGroup.Video, FileExtensionGroup.Xls];

  return allowedGroups.includes(fileExtensionGroup);
}

const DownloadFile = ({ onDownload, translate }) => (
  <div className={'z-10 mt-3 flex h-11 shrink-0 flex-row items-center justify-end space-x-2 rounded-lg bg-primary'}>
    <button
      title={translate('actions.download')}
      onClick={onDownload}
      className="flex h-10 cursor-pointer flex-row items-center space-x-2 rounded-lg bg-white/0
                           px-6 font-medium transition duration-50
                          ease-in-out hover:bg-white/10 focus:bg-white/5"
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
  show,
  progress,
  isAuthenticated,
  isShareView,
  blob,
  changeFile,
  totalFolderIndex,
  fileIndex,
}: FileViewerProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const [isPreviewAvailable, setIsPreviewAvailable] = useState<boolean>(true);

  const ItemIconComponent = iconService.getItemIcon(false, file?.type);
  const filename = file ? `${file?.plainName ?? file.name}${file.type ? `.${file.type}` : ''}` : '';

  const isMoveItemsDialogOpen = useAppSelector((state: RootState) => state.ui.isMoveItemsDialogOpen);
  const isCreateFolderDialogOpen = useAppSelector((state: RootState) => state.ui.isCreateFolderDialogOpen);
  const isEditNameDialogOpen = useAppSelector((state: RootState) => state.ui.isEditFolderNameDialog);
  const isShareItemSettingsDialogOpen = useAppSelector((state) => state.ui.isShareItemDialogOpenInPreviewView);

  const trackFilePreviewProperties: TrackingPlan.FilePreviewProperties = {
    file_size: file?.size,
    file_extension: file?.type,
    preview_id: file?.uuid,
  };

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

  useEffect(() => {
    setIsPreviewAvailable(true);
    const largeFile = isLargeFile(file?.size);
    trackFilePreviewClicked(trackFilePreviewProperties);
    if (show && isTypeAllowed) {
      if (shouldNotBeRendered(fileExtensionGroup) && largeFile) {
        setIsPreviewAvailable(false);
        return;
      }
      trackFilePreviewOpened(trackFilePreviewProperties);
    } else {
      setIsPreviewAvailable(false);
    }
  }, [show, file]);

  const onClosePreview = () => {
    onClose();
    trackFilePreviewed(trackFilePreviewProperties);
  };

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
        onClose={onClosePreview}
      >
        <div className="flex h-screen w-screen flex-col items-center justify-center">
          {/* Close overlay */}
          <Dialog.Overlay className="fixed inset-0 bg-black/85 backdrop-blur-md" />

          {/* Content */}
          <>
            {file && <ShareItemDialog share={file?.shares?.[0]} isPreviewView item={file as DriveItemData} />}
            {fileIndex === 0 || isShareView ? null : (
              <button
                title={translate('actions.previous')}
                className="absolute left-4 top-1/2 z-30 rounded-full bg-black p-4 text-white outline-none"
                onClick={() => changeFile('prev')}
              >
                <CaretLeft size={24} />
              </button>
            )}

            {isTypeAllowed && isPreviewAvailable ? (
              <div
                tabIndex={0}
                className="z-10 flex max-h-full max-w-full flex-col items-start justify-start overflow-auto outline-none"
              >
                <div onClick={(e) => e.stopPropagation()} className="">
                  {blob && file ? (
                    <Suspense fallback={<div></div>}>
                      <Viewer
                        blob={blob}
                        changeFile={changeFile}
                        file={file}
                        setIsPreviewAvailable={setIsPreviewAvailable}
                      />
                    </Suspense>
                  ) : (
                    <>
                      <div
                        tabIndex={0}
                        className={`${
                          progress === 1 ? 'hidden' : 'flex'
                        } pointer-events-none z-10 select-none flex-col items-center justify-center rounded-xl
                      font-medium outline-none`}
                      >
                        <div className="flex h-20 w-20 items-center">
                          <ItemIconComponent width={80} height={80} />
                        </div>
                        <span className="w-96 truncate pt-4 text-center text-lg" title={filename}>
                          {filename}
                        </span>
                        <span className="text-white/50">{translate('drive.loadingFile')}</span>
                        <div className="mt-8 h-1.5 w-56 rounded-full bg-white/25">
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
                className="z-10 flex select-none flex-col items-center justify-center space-y-6
                      rounded-xl font-medium outline-none"
              >
                <div className="flex flex-col items-center justify-center">
                  <div className="flex h-20 w-20 items-center">
                    <ItemIconComponent width={80} height={80} />
                  </div>
                  <span className="w-96 truncate pt-4 text-center text-lg" title={filename}>
                    {filename}
                  </span>
                  <span className="text-white/50">{translate('error.noFilePreview')}</span>
                </div>

                <DownloadFile onDownload={onDownload} translate={translate} />
              </div>
            )}
            {fileIndex === totalFolderIndex - 1 || isShareView ? null : (
              <button
                title={translate('actions.next')}
                className="absolute right-4 top-1/2 z-30 rounded-full bg-black p-4 text-white outline-none"
                onClick={() => changeFile('next')}
              >
                <CaretRight size={24} />
              </button>
            )}
          </>

          {/* Background */}
          <div className="pointer-events-none fixed -inset-x-20 -top-6 z-10 h-16 bg-black blur-2xl" />

          {/* Top bar controls */}
          <div
            className="fixed inset-x-0 top-0 z-20 flex h-0 w-screen max-w-full select-none flex-row
                          items-start justify-between px-4 text-lg"
          >
            {/* Close and title */}
            <div className="mr-6 mt-3 flex h-10 flex-row items-center justify-start space-x-4 truncate md:mr-32">
              <button
                onClick={onClosePreview}
                className="group relative flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-full bg-white/0 transition duration-50 ease-in-out hover:bg-white/10 focus:bg-white/5"
              >
                <UilMultiply height={24} width={24} />
              </button>

              <Dialog.Title className="flex w-11/12 flex-row items-center text-lg">
                <div className="mr-3 flex h-8 w-8 items-center">
                  <ItemIconComponent width={32} height={32} />
                </div>
                <p className="w-full truncate" title={filename}>
                  {filename}
                </p>
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
