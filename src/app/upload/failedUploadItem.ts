import { UploadItem, UploadItemKind } from 'app/upload/types';
import { UploadFailure } from 'app/upload/uploadFailure';
import { FailedUploadItem } from 'app/tasks/types';

export const toFailedUploadItem = (
  item: UploadItem,
  { isRetryable }: UploadFailure,
  retry: () => Promise<void>,
): FailedUploadItem => {
  if (item.kind === UploadItemKind.Folder) {
    return {
      name: item.folder.name,
      size: 0,
      modifiedAt: Date.now(),
      isFolder: true,
      isRetryable,
      isRetrying: false,
      retry,
    };
  }

  return {
    name: item.file.name,
    type: item.file.type,
    size: item.file.size,
    modifiedAt: item.file.content.lastModified,
    isFolder: false,
    isRetryable,
    isRetrying: false,
    retry,
  };
};
