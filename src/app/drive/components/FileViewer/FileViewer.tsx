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
import { getThumbnailFrom, setCurrentThumbnail, setThumbnails, ThumbnailToUpload, uploadThumbnail } from 'app/drive/services/thumbnail.service';
import { FileToUpload } from 'app/drive/services/file.service/uploadFile';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { sessionSelectors } from 'app/store/slices/session/session.selectors';
import localStorageService from 'app/core/services/local-storage.service';
import { Thumbnail } from '@internxt/sdk/dist/drive/storage/types';

interface FileViewerProps {
  file?: DriveFileData;
  onClose: () => void;
  onDownload: () => void;
  downloader: (abortController: AbortController) => Promise<Blob>
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
    isTypeAllowed = extensions.includes(file && file.type ? file.type.toLowerCase() : '');

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

  useEffect(() => {
    if (isTypeAllowed && show) {
      const abortController = new AbortController();

      downloader(abortController)
        .then(async (fileBlob) => {
          setBlob(fileBlob);
          if (file) {
            const currentThumbnail = file.thumbnails && file.thumbnails.length > 0 ? file.thumbnails[0] : null;
            const fileObject = new File([fileBlob], file.name);
            const fileUpload: FileToUpload = {
              name: file.name,
              size: file.size,
              type: file.type,
              content: fileObject,
              parentFolderId: file.folderId,
            };

            const thumbnail = await getThumbnailFrom(fileUpload);

            //Don't upload generated thumbnail if it match in size and type with currentThumbnail
            if (thumbnail && thumbnail.file && thumbnail.type &&
              (!currentThumbnail || (currentThumbnail &&
                (Number(currentThumbnail.size) !== Number(thumbnail.file.size) || currentThumbnail.type !== thumbnail.type)))) {

              const thumbnailToUpload: ThumbnailToUpload = {
                fileId: file.id,
                size: thumbnail.file.size,
                type: thumbnail.type,
                content: thumbnail.file
              };
              const updateProgressCallback = () => { return; };
              const abortController = new AbortController();

              const thumbnailUploaded = await uploadThumbnail(userEmail, thumbnailToUpload, isTeam, updateProgressCallback, abortController);

              if (thumbnailUploaded && thumbnail.file) {
                setCurrentThumbnail(thumbnail.file, file as DriveItemData, dispatch);

                let newThumbnails: Thumbnail[];
                if (currentThumbnail) {
                  //Replace existing thumbnail with the new uploadedThumbnail
                  newThumbnails = file.thumbnails?.length > 0 ? [...file.thumbnails] : [thumbnailUploaded];
                  newThumbnails.splice(newThumbnails.indexOf(currentThumbnail), 1, thumbnailUploaded);
                } else {
                  newThumbnails = file.thumbnails?.length > 0 ? [...file.thumbnails, ...[thumbnailUploaded]] : [thumbnailUploaded];
                }
                setThumbnails(newThumbnails, file as DriveItemData, dispatch);
              }
            }
          }
        })
        .catch(() => {
          if (abortController.signal.aborted) {
            return;
          }
        });
      return () => abortController.abort();
    } else if (!show) setBlob(null);
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
