import { UploadItem, UploadItemKind } from 'app/upload/types';
import { UploadFailure } from 'app/upload/uploadFailure';
import { FailedUploadItem } from 'app/tasks/types';

export const toFailedUploadItem = (id: string, item: UploadItem, { isRetryable }: UploadFailure): FailedUploadItem => {
  if (item.kind === UploadItemKind.Folder) {
    return {
      id,
      name: item.folder.name,
      size: 0,
      modifiedAt: Date.now(),
      isFolder: true,
      isRetryable,
      isRetrying: false,
    };
  }

  return {
    id,
    name: item.file.name,
    type: item.file.type,
    size: item.file.size,
    modifiedAt: item.file.content.lastModified,
    isFolder: false,
    isRetryable,
    isRetrying: false,
  };
};
