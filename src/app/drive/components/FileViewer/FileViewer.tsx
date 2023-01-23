import { Suspense, Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { FileExtensionGroup, fileExtensionPreviewableGroups } from '../../types/file-types';
import fileExtensionService from '../../services/file-extension.service';
import viewers from './viewers';
import i18n from '../../../i18n/services/i18n.service';

import UilImport from '@iconscout/react-unicons/icons/uil-import';
import UilMultiply from '@iconscout/react-unicons/icons/uil-multiply';
import spinnerIcon from '../../../../assets/icons/spinner.svg';
import { DriveFileData, DriveItemData } from 'app/drive/types';
import { compareThumbnail, getThumbnailFrom, setCurrentThumbnail, setThumbnails, ThumbnailToUpload, uploadThumbnail } from 'app/drive/services/thumbnail.service';
import { FileToUpload } from 'app/drive/services/file.service/uploadFile';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { sessionSelectors } from 'app/store/slices/session/session.selectors';
import localStorageService from 'app/core/services/local-storage.service';
import { Thumbnail } from '@internxt/sdk/dist/drive/storage/types';
import databaseService, { DatabaseCollection } from '../../../database/services/database.service';
import dateService from '../../../core/services/date.service';
import { updateDatabaseFileSourceData } from '../../services/database.service';

interface FileViewerProps {
  file?: DriveFileData;
  onClose: () => void;
  onDownload: () => void;
  downloader: (abortController: AbortController) => Promise<Blob>;
  show: boolean;
}

export interface FormatFileViewerProps {
  blob: Blob;
}

const extensionsList = fileExtensionService.computeExtensionsLists(fileExtensionPreviewableGroups);

const FileViewer = ({ file, onClose, onDownload, downloader, show }: FileViewerProps): JSX.Element => {
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

  const dispatch = useAppDispatch();
  const isTeam = useAppSelector(sessionSelectors.isTeam);
  const userEmail: string = localStorageService.getUser()?.email || '';

  const handleFileThumbnail = async (driveFile: DriveFileData, file: File) => {
    const currentThumbnail = driveFile.thumbnails && driveFile.thumbnails.length > 0 ? driveFile.thumbnails[0] : null;
    const fileObject = new File([file], driveFile.name);
    const fileUpload: FileToUpload = {
      name: driveFile.name,
      size: driveFile.size,
      type: driveFile.type,
      content: fileObject,
      parentFolderId: driveFile.folderId,
    };

    const thumbnailGenerated = await getThumbnailFrom(fileUpload);

    if (thumbnailGenerated.file && (!currentThumbnail || !compareThumbnail(currentThumbnail, thumbnailGenerated))) {
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
      }
    }
  };

  const checkIfDatabaseBlobIsOlderAngGetFolderBlobs = async (fileToView?: DriveFileData) => {
    const folderBlobItems = await databaseService.get(DatabaseCollection.LevelsBlobs, fileToView?.folderId as number);
    const databaseBlob = folderBlobItems?.find((blobItem) => blobItem?.id === fileToView?.id);

    const isDatabaseBlobOlder = !databaseBlob?.updatedAt
      ? true
      : dateService.isDateOneBefore({
          dateOne: databaseBlob?.updatedAt as string,
          dateTwo: fileToView?.updatedAt as string,
        });

    if (fileToView && databaseBlob && !isDatabaseBlobOlder) {
      setBlob(databaseBlob.source as Blob);
      await handleFileThumbnail(fileToView, databaseBlob.source as File);

      return { isOlder: false, folderBlobItems };
    }
    return { isOlder: true, folderBlobItems };
  };

  useEffect(() => {
    if (isTypeAllowed && show) {
      const abortController = new AbortController();

      checkIfDatabaseBlobIsOlderAngGetFolderBlobs(file).then(({ isOlder, folderBlobItems }) => {
        if (file && isOlder) {
          downloader(abortController)
            .then(async (fileBlob) => {
              setBlob(fileBlob);

              updateDatabaseFileSourceData({
                databaseFolderBlobItems: folderBlobItems,
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
  }, [show]);

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
            className="fixed inset-0 bg-cool-gray-100 bg-opacity-90 backdrop-blur-md
                                    backdrop-filter"
          />

          {/* Content */}
          {isTypeAllowed ? (
            <div
              tabIndex={0}
              className="outline-none z-10 flex max-h-full max-w-full flex-col items-start justify-start overflow-auto"
            >
              <div onClick={(e) => e.stopPropagation()} className="">
                {blob ? (
                  <Suspense fallback={<div></div>}>
                    <Viewer blob={blob} />
                  </Suspense>
                ) : (
                  <div
                    tabIndex={0}
                    className="outline-none pointer-events-none z-10 flex h-12 select-none flex-row items-center justify-center
                      space-x-2 rounded-xl bg-white bg-opacity-5 px-6 font-medium"
                  >
                    <img className="mr-2 animate-spin" src={spinnerIcon} alt="" />
                    <span>{i18n.get('drive.loadingFile')}</span>
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
              <span>{i18n.get('error.noFilePreview')}</span>
            </div>
          )}

          {/* Background */}
          <div
            className="pointer-events-none fixed -inset-x-20 -top-6 z-10 h-16 bg-cool-gray-100
                          blur-2xl filter"
          />

          {/* Top bar controls */}
          <div
            className="fixed inset-x-0 top-0 z-20 flex h-0 w-screen max-w-full select-none flex-row
                          items-start justify-between px-4 text-lg font-medium"
          >
            {/* Close and title */}
            <div className="z-10 mt-3 mr-6 flex h-10 flex-row items-center justify-start space-x-4 truncate md:mr-32">
              <button
                onClick={onClose}
                className="group relative flex h-10 w-10 flex-shrink-0 flex-col items-center justify-center rounded-full
                                bg-white bg-opacity-0 transition duration-50 ease-in-out
                                hover:bg-opacity-10 focus:bg-opacity-5"
              >
                <UilMultiply height="20" width="20" />
              </button>

              <Dialog.Title className="truncate">{filename}</Dialog.Title>
            </div>

            {/* Download button */}
            <div className="z-10 mt-3 flex h-10 flex-shrink-0 flex-row items-center justify-end space-x-4">
              <button
                onClick={onDownload}
                className="flex h-10 cursor-pointer flex-row items-center space-x-2 rounded-lg bg-white
                          bg-opacity-0 px-6 font-medium transition duration-50
                          ease-in-out hover:bg-opacity-10 focus:bg-opacity-5"
              >
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
