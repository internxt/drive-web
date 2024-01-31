import { useCallback } from 'react';
import { DriveItemData } from '../../drive/types';
import { TaskNotification, TaskType, UploadFolderData } from '../types';

interface RetryDownload {
  retryDownload: () => void;
}

type RetryDownloadArgs = {
  notification: TaskNotification;
  downloadItemsAsZip: (items: DriveItemData[], existingTaskId: string) => void;
  downloadItems: (item: DriveItemData, existingTaskId: string) => void;
};

export const useRetryDownload = ({
  notification,
  downloadItemsAsZip,
  downloadItems,
}: RetryDownloadArgs): RetryDownload => {
  const retryDownload = useCallback(() => {
    const { item, taskId } = notification;
    const isZipAndMultipleItems = item && 'items' in item && item?.items && item?.type === 'zip';

    if (isZipAndMultipleItems) {
      downloadItemsAsZip(item.items as DriveItemData[], taskId);
    } else if (item && taskId) {
      downloadItems(item as DriveItemData, taskId);
    }
  }, [notification]);

  return { retryDownload };
};

interface RetryUpload {
  retryUpload: () => void;
}

type RetryUploadArgs = {
  notification: TaskNotification;
  uploadFolder: (data: UploadFolderData & { taskId: string }) => void;
  uploadItem: (data: { uploadFile: File; parentFolderId: number; taskId: string; fileType: string }) => void;
  showErrorNotification: () => void;
};

export const useRetryUpload = ({
  notification,
  uploadFolder,
  uploadItem,
  showErrorNotification,
}: RetryUploadArgs): RetryUpload => {
  const retryUpload = useCallback(() => {
    const { item, taskId, action } = notification;
    const isFolderUpload = action === TaskType.UploadFolder;

    if (isFolderUpload) {
      const uploadFolderData: UploadFolderData | undefined = notification?.item as UploadFolderData;
      const folder = uploadFolderData?.folder;
      const currentFolderId = uploadFolderData?.parentFolderId;

      if (folder && currentFolderId)
        uploadFolder({
          folder,
          parentFolderId: currentFolderId,
          taskId,
        });
    } else if (item && taskId) {
      const uploadItemData = item as { uploadFile: File; parentFolderId: number };
      uploadItem({
        uploadFile: uploadItemData.uploadFile,
        parentFolderId: uploadItemData.parentFolderId,
        taskId: notification.taskId,
        fileType: notification.fileType as string,
      });
    } else {
      showErrorNotification();
    }
  }, [notification]);

  return { retryUpload };
};
