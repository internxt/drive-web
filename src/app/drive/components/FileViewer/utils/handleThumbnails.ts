import { Thumbnail } from '@internxt/sdk/dist/drive/storage/types';
import localStorageService from 'app/core/services/local-storage.service';
import { getDatabaseFilePreviewData, updateDatabaseFilePreviewData } from 'app/drive/services/database.service';
import { FileToUpload } from 'app/drive/services/file.service/uploadFile';
import {
  compareThumbnail,
  getThumbnailFrom,
  setCurrentThumbnail,
  setThumbnails,
  ThumbnailToUpload,
  uploadThumbnail,
} from 'app/drive/services/thumbnail.service';
import { DriveFileData, DriveItemData } from 'app/drive/types';
import { PreviewFileItem } from 'app/share/types';
import { AppDispatch } from 'app/store';

const handleUpdateLocalImageThumbnail = async (
  thumbnailFile: File,
  driveFile: DriveFileData,
  currentThumbnail: Thumbnail | null,
  dispatch: AppDispatch,
  thumbnailUploaded?: Thumbnail,
) => {
  const isThumbnailGeneratedAndUploaded = thumbnailUploaded && thumbnailFile;

  if (isThumbnailGeneratedAndUploaded) {
    setCurrentThumbnail(thumbnailFile, thumbnailUploaded, driveFile as DriveItemData, dispatch);

    let newThumbnails: Thumbnail[];

    const existLocalThumbnail = !!currentThumbnail;
    if (existLocalThumbnail) {
      //Replace existing thumbnail with the new uploadedThumbnail
      newThumbnails = driveFile.thumbnails?.length > 0 ? [...driveFile.thumbnails] : [thumbnailUploaded];
      newThumbnails.splice(newThumbnails.indexOf(currentThumbnail), 1, thumbnailUploaded);
    } else {
      newThumbnails =
        driveFile.thumbnails?.length > 0 ? [...driveFile.thumbnails, ...[thumbnailUploaded]] : [thumbnailUploaded];
    }

    setThumbnails(newThumbnails, driveFile as DriveItemData, dispatch);
    await updateDatabaseFilePreviewData({
      fileId: driveFile.id,
      folderId: driveFile.folderId,
      previewBlob: thumbnailFile,
      updatedAt: driveFile.updatedAt,
    });
  }
};

export const handleFileThumbnail = async (driveFile: PreviewFileItem, file: File | Blob, dispatch: AppDispatch) => {
  const user = localStorageService.getUser();
  const userEmail = user?.email ?? '';
  const currentThumbnail = driveFile.thumbnails && driveFile.thumbnails.length > 0 ? driveFile.thumbnails[0] : null;
  const databaseThumbnail = await getDatabaseFilePreviewData({ fileId: driveFile.id });
  const existsThumbnailInDatabase = !!databaseThumbnail;

  const fileObject = new File([file], driveFile.name);

  const fileUpload: FileToUpload = {
    name: driveFile.name,
    size: driveFile.size,
    type: driveFile.type,
    content: fileObject,
    parentFolderId: driveFile.folderUuid,
  };

  const thumbnailGenerated = await getThumbnailFrom(fileUpload);

  const isDifferentThumbnailOrNotExists = !currentThumbnail || !compareThumbnail(currentThumbnail, thumbnailGenerated);

  if (isDifferentThumbnailOrNotExists && thumbnailGenerated.file) {
    const thumbnailToUpload: ThumbnailToUpload = {
      fileId: driveFile.id,
      size: thumbnailGenerated.file.size,
      max_width: thumbnailGenerated.max_width,
      max_height: thumbnailGenerated.max_height,
      type: thumbnailGenerated.type,
      content: thumbnailGenerated.file,
    };

    const thumbnailUploaded = await uploadThumbnail(userEmail, thumbnailToUpload, false, () => {});

    setCurrentThumbnail(thumbnailGenerated.file, thumbnailUploaded, driveFile as DriveItemData, dispatch);

    await handleUpdateLocalImageThumbnail(
      thumbnailGenerated.file,
      driveFile,
      currentThumbnail,
      dispatch,
      thumbnailUploaded,
    );
  } else if (!existsThumbnailInDatabase && thumbnailGenerated?.file) {
    await updateDatabaseFilePreviewData({
      fileId: driveFile.id,
      folderId: driveFile.folderId,
      previewBlob: new Blob([thumbnailGenerated?.file], { type: thumbnailGenerated.file?.type }),
      updatedAt: driveFile.updatedAt,
    });
  }
};
