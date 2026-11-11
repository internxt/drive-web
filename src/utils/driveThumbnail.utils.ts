import { FetchFolderFilesCursorResponse } from '@internxt/sdk/dist/drive/storage/types';
import { DriveFileData } from 'app/drive/types';

type DriveThumbnail = DriveFileData['thumbnails'][number];
type ThumbnailDto = NonNullable<FetchFolderFilesCursorResponse['files'][number]['thumbnails']>[number];

export const toDriveThumbnail = (thumbnail: ThumbnailDto | DriveThumbnail): DriveThumbnail => {
  const isAlreadyDriveThumbnail = 'bucket_id' in thumbnail;
  if (isAlreadyDriveThumbnail) return thumbnail;

  return {
    id: thumbnail.id,
    file_id: thumbnail.fileId,
    type: thumbnail.type,
    max_width: thumbnail.maxWidth,
    max_height: thumbnail.maxHeight,
    size: thumbnail.size,
    bucket_id: thumbnail.bucketId,
    bucket_file: thumbnail.bucketFile,
    encrypt_version: thumbnail.encryptVersion,
  };
};
