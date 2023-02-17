import { Suspense, Fragment, useState, useEffect, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import fileExtensionService from '../../services/file-extension.service';
import viewers from './viewers';

import UilImport from '@iconscout/react-unicons/icons/uil-import';
import UilMultiply from '@iconscout/react-unicons/icons/uil-multiply';
import { DriveFileData, DriveItemData } from 'app/drive/types';
import {
  compareThumbnail,
  getThumbnailFrom,
  setCurrentThumbnail,
  setThumbnails,
  ThumbnailToUpload,
  uploadThumbnail,
} from 'app/drive/services/thumbnail.service';
import { FileToUpload } from 'app/drive/services/file.service/uploadFile';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { sessionSelectors } from 'app/store/slices/session/session.selectors';
import localStorageService from 'app/core/services/local-storage.service';
import { Thumbnail } from '@internxt/sdk/dist/drive/storage/types';
import dateService from '../../../core/services/date.service';
import {
  getDatabaseFilePrewiewData,
  getDatabaseFileSourceData,
  updateDatabaseFilePrewiewData,
  updateDatabaseFileSourceData,
} from '../../services/database.service';
import { FileExtensionGroup, fileExtensionPreviewableGroups } from 'app/drive/types/file-types';
import iconService from 'app/drive/services/icon.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { CaretLeft, CaretRight } from 'phosphor-react';

interface FileViewerProps {
  file?: DriveFileData;
  onClose: () => void;
  onDownload: () => void;
  downloader: (abortController: AbortController) => Promise<Blob>;
  show: boolean;
  progress?: number;
  setCurrentFile?: (file: DriveFileData) => void;
}

export interface FormatFileViewerProps {
  blob: Blob;
  changeFile: (direction: string) => void;
}

const extensionsList = fileExtensionService.computeExtensionsLists(fileExtensionPreviewableGroups);

const FileViewer = ({
  file,
  onClose,
  onDownload,
  downloader,
  setCurrentFile,
  show,
  progress,
}: FileViewerProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const ItemIconComponent = iconService.getItemIcon(false, file?.type);
  const filename = file ? `${file.name}${file.type ? `.${file.type}` : ''}` : '';

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

  // Get all files in the current folder and find the current file to display the file
  const currentItemsFolder = useAppSelector((state) => state.storage.levels[file?.folderId || '']);
  const folderFiles = useMemo(() => currentItemsFolder?.filter((item) => !item.isFolder), [currentItemsFolder]);
  const totalIndex = folderFiles?.length;
  const fileIndex = folderFiles?.findIndex((item) => item === file);

  function changeFile(direction: 'next' | 'prev') {
    setBlob(null);
    if (direction === 'next') {
      if (fileIndex === totalIndex - 1) {
        setCurrentFile?.(folderFiles[0]);
      } else {
        setCurrentFile?.(folderFiles[fileIndex + 1]);
      }
    } else {
      if (fileIndex === 0) {
        setCurrentFile?.(folderFiles[totalIndex - 1]);
      } else {
        setCurrentFile?.(folderFiles[fileIndex - 1]);
      }
    }
  }

  const dispatch = useAppDispatch();
  const isTeam = useAppSelector(sessionSelectors.isTeam);
  const userEmail: string = localStorageService.getUser()?.email || '';

  const handleFileThumbnail = async (driveFile: DriveFileData, file: File) => {
    const currentThumbnail = driveFile.thumbnails && driveFile.thumbnails.length > 0 ? driveFile.thumbnails[0] : null;
    const databaseThumbnail = await getDatabaseFilePrewiewData({ fileId: driveFile.id });

    const fileObject = new File([file], driveFile.name);
    const fileUpload: FileToUpload = {
      name: driveFile.name,
      size: driveFile.size,
      type: driveFile.type,
      content: fileObject,
      parentFolderId: driveFile.folderId,
    };

    const thumbnailGenerated = await getThumbnailFrom(fileUpload);

    const isDifferentThumbnailOrNotExists =
      !currentThumbnail || !compareThumbnail(currentThumbnail, thumbnailGenerated);

    if (thumbnailGenerated.file && isDifferentThumbnailOrNotExists) {
      const thumbnailToUpload: ThumbnailToUpload = {
        fileId: driveFile.id,
        size: thumbnailGenerated.file.size,
        max_width: thumbnailGenerated.max_width,
        max_height: thumbnailGenerated.max_height,
        type: thumbnailGenerated.type,
        content: thumbnailGenerated.file,
      };
      const updateProgressCallback = () => {
        return;
      };
      const abortController = new AbortController();

      const thumbnailUploaded = await uploadThumbnail(
        userEmail,
        thumbnailToUpload,
        isTeam,
        updateProgressCallback,
        abortController,
      );

      if (thumbnailUploaded && thumbnailGenerated.file) {
        setCurrentThumbnail(thumbnailGenerated.file, thumbnailUploaded, driveFile as DriveItemData, dispatch);

        let newThumbnails: Thumbnail[];
        if (currentThumbnail) {
          //Replace existing thumbnail with the new uploadedThumbnail
          newThumbnails = driveFile.thumbnails?.length > 0 ? [...driveFile.thumbnails] : [thumbnailUploaded];
          newThumbnails.splice(newThumbnails.indexOf(currentThumbnail), 1, thumbnailUploaded);
        } else {
          newThumbnails =
            driveFile.thumbnails?.length > 0 ? [...driveFile.thumbnails, ...[thumbnailUploaded]] : [thumbnailUploaded];
        }
        setThumbnails(newThumbnails, driveFile as DriveItemData, dispatch);
        await updateDatabaseFilePrewiewData({
          fileId: driveFile.id,
          folderId: driveFile.folderId,
          previewBlob: thumbnailToUpload.content,
          updatedAt: driveFile.updatedAt,
        });
      }
    } else if (!databaseThumbnail && thumbnailGenerated?.file) {
      await updateDatabaseFilePrewiewData({
        fileId: driveFile.id,
        folderId: driveFile.folderId,
        previewBlob: new Blob([thumbnailGenerated?.file], { type: thumbnailGenerated.file?.type }),
        updatedAt: driveFile.updatedAt,
      });
    }
  };

  const checkIfDatabaseBlobIsOlder = async (fileToView: DriveFileData) => {
    const fileId = fileToView?.id;
    const databaseBlob = await getDatabaseFileSourceData({ fileId });

    const isDatabaseBlobOlder = !databaseBlob?.updatedAt
      ? true
      : dateService.isDateOneBefore({
          dateOne: databaseBlob?.updatedAt as string,
          dateTwo: fileToView?.updatedAt as string,
        });

    if (fileToView && databaseBlob?.source && !isDatabaseBlobOlder) {
      setBlob(databaseBlob.source as Blob);
      await handleFileThumbnail(fileToView, databaseBlob.source as File);

      return false;
    }
    return true;
  };

  useEffect(() => {
    if (isTypeAllowed && show && file) {
      const abortController = new AbortController();

      checkIfDatabaseBlobIsOlder(file).then((isOlder) => {
        if (file && isOlder) {
          downloader(abortController)
            .then(async (fileBlob) => {
              setBlob(fileBlob);
              await updateDatabaseFileSourceData({
                folderId: file?.folderId,
                sourceBlob: fileBlob,
                fileId: file?.id,
                updatedAt: file?.updatedAt,
              });

              if (file) {
                await handleFileThumbnail(file, fileBlob as File);
              }
            })
            .catch(() => {
              if (abortController.signal.aborted) {
                return;
              }
            });
        }
        return () => abortController.abort();
      });
    } else if (!show) {
      setBlob(null);
    }
  }, [show, file]);

  const DownoladButton = ({ background }: { background?: string }) => (
    <div
      className={`${background} z-10 mt-3 flex h-10 flex-shrink-0 flex-row items-center justify-end space-x-4 rounded-lg`}
    >
      <button
        onClick={onDownload}
        className="flex h-10 cursor-pointer flex-row items-center space-x-2 rounded-lg bg-white
                          bg-opacity-0 px-6 font-medium transition duration-50
                          ease-in-out hover:bg-opacity-10 focus:bg-opacity-5"
      >
        <UilImport height="20" width="20" />
        <span className="font-medium">{translate('actions.download')}</span>
      </button>
    </div>
  );

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
            <button
              className="absolute top-1/2 left-10 z-30 rounded-full bg-black p-4 text-white"
              onClick={() => changeFile('prev')}
            >
              <CaretLeft size={24} />
            </button>
            {isTypeAllowed ? (
              <div
                tabIndex={0}
                className="outline-none z-10 flex max-h-full max-w-full flex-col items-start justify-start overflow-auto"
              >
                <div onClick={(e) => e.stopPropagation()} className="">
                  {blob ? (
                    <Suspense fallback={<div></div>}>
                      <Viewer blob={blob} changeFile={changeFile} />
                    </Suspense>
                  ) : progress !== undefined ? (
                    <>
                      <div
                        tabIndex={0}
                        className={`${
                          progress === 1 ? 'hidden' : 'flex'
                        } outline-none pointer-events-none z-10 select-none flex-col items-center justify-center
                      rounded-xl font-medium`}
                      >
                        <ItemIconComponent className="mr-3 flex" width={60} height={80} />
                        <span className="text-lg">{filename}</span>
                        <span className="text-white text-opacity-50">{translate('drive.loadingFile')}</span>
                        <div className="mt-8 h-1.5 w-56 rounded-full bg-white bg-opacity-25">
                          <div
                            className="h-1.5 rounded-full bg-white"
                            style={{ width: `${progress !== undefined && Number(progress) ? progress * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div
                      className="outline-none pointer-events-none z-10 flex select-none flex-col items-center justify-center
                      rounded-xl font-medium"
                    >
                      <ItemIconComponent className="mr-3 flex" width={60} height={80} />
                      <span className="text-lg">{filename}</span>
                      <span className="text-white text-opacity-50">{translate('drive.previewNoAvailable')}</span>
                      <DownoladButton background="bg-primary" />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                tabIndex={0}
                className="outline-none pointer-events-none z-10 flex h-12 select-none flex-row items-center justify-center
                          space-x-2 rounded-xl bg-white bg-opacity-5 px-6 font-medium"
              >
                <span>{translate('error.noFilePreview')}</span>
              </div>
            )}
            <button
              className="absolute top-1/2 right-10 z-30 rounded-full bg-black p-4 text-white"
              onClick={() => changeFile('next')}
            >
              <CaretRight size={24} />
            </button>
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

              <Dialog.Title className="flex flex-row items-center truncate text-lg">
                <ItemIconComponent className="mr-3" width={32} height={32} />
                {filename}
              </Dialog.Title>
            </div>

            {/* Download button */}
            <DownoladButton />
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default FileViewer;
