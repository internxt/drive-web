import storageThunks from '../../../store/slices/storage/storage.thunks';
import { DriveFileData, DriveItemData } from '../../types';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';

import FileViewer from './FileViewer';
import { sessionSelectors } from '../../../store/slices/session/session.selectors';
import downloadService from '../../services/download.service';
import { useEffect, useState } from 'react';
import { isTypeSupportedByVideoPlayer } from '../../../core/services/media.service';
import {
  getDatabaseFileSourceData,
  getDatabaseFilePrewiewData,
  updateDatabaseFilePrewiewData,
  canFileBeCached,
  updateDatabaseFileSourceData
} from '../../services/database.service';
import dateService from '../../../core/services/date.service';
import {
  compareThumbnail,
  getThumbnailFrom,
  setCurrentThumbnail,
  setThumbnails,
  ThumbnailToUpload,
  uploadThumbnail,
} from 'app/drive/services/thumbnail.service';
import { Thumbnail } from '@internxt/sdk/dist/drive/storage/types';
import { FileToUpload } from 'app/drive/services/file.service/uploadFile';
import localStorageService from 'app/core/services/local-storage.service';

interface FileViewerWrapperProps {
  file: DriveFileData;
  onClose: () => void;
  showPreview: boolean;
}

const FileViewerWrapper = ({ file, onClose, showPreview }: FileViewerWrapperProps): JSX.Element => {
  const isTeam = useAppSelector(sessionSelectors.isTeam);
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const dispatch = useAppDispatch();
  const onDownload = () => currentFile && dispatch(storageThunks.downloadItemsThunk([currentFile as DriveItemData]));

  const [updateProgress, setUpdateProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<DriveFileData>();

  function downloadFile(currentFile) {
    return (abortController: AbortController) =>
      isTypeSupportedByVideoPlayer(currentFile.type)
        ? Promise.resolve(new Blob())
        : downloadService.fetchFileBlob(
          { ...currentFile, bucketId: currentFile.bucket },
          {
            updateProgressCallback: (progress) => setUpdateProgress(progress),
            isTeam,
            abortController,
          },
    );
  }

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

      let thumbnailUploaded;

      if (userEmail)
        thumbnailUploaded = await uploadThumbnail(
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

  function getFileContentManager() {
    const abortController = new AbortController();

    return {
      download: async (): Promise<Blob> => {
        const shouldFileBeCached = canFileBeCached(file);
        const fileSource = await getDatabaseFileSourceData({ fileId: file.id });
        const isCached = !!fileSource;
        let fileContent: Blob;

        if (isCached) {
          const isCacheExpired = !fileSource?.updatedAt
            ? true
            : dateService.isDateOneBefore({
                dateOne: fileSource?.updatedAt as string,
                dateTwo: file?.updatedAt as string,
              });
          if (isCacheExpired) {
            fileContent = await downloadFile(file)(abortController);
            await updateDatabaseFileSourceData({
              folderId: file.folderId,
              sourceBlob: fileContent,
              fileId: file.id,
              updatedAt: file.updatedAt,
            });
          } else {
            fileContent = fileSource.source as Blob;
            await handleFileThumbnail(file, fileSource.source as File);
          }
        } else {
          fileContent = await downloadFile(file)(abortController);
          if (shouldFileBeCached) {
            await updateDatabaseFileSourceData({
              folderId: file.folderId,
              sourceBlob: fileContent,
              fileId: file.id,
              updatedAt: file.updatedAt,
            });
          }
        }
      
        return fileContent;
      },
      abort: () => {
        abortController.abort();
      }
    };
  }

  const fileContentManager = getFileContentManager();

  useEffect(() => {
    file && setCurrentFile(file);
  }, [file]);

  return showPreview ? (
    <FileViewer
      show={showPreview}
      file={currentFile}
      onClose={() => {
        onClose();
        fileContentManager.abort();
      }}
      onDownload={onDownload}
      downloader={fileContentManager.download.bind(fileContentManager)}
      setCurrentFile={setCurrentFile}
      progress={updateProgress}
      isAuthenticated={isAuthenticated}
    />
  ) : (
    <div className="hidden" />
  );
};

export default FileViewerWrapper;
