import { useCallback } from 'react';
import { DriveItemData } from '../../drive/types';
import { SharedItemAuthenticationData, TaskNotification, TaskType, UploadFolderData } from '../types';

interface RetryDownload {
  retryDownload: () => void;
}

type RetryDownloadArgs = {
  notification: TaskNotification;
  downloadItemsAsZip: (items: DriveItemData[], existingTaskId: string) => void;
  downloadItems: (item: DriveItemData, existingTaskId: string) => void;
  showErrorNotification: () => void;
};

export const useRetryDownload = ({
  notification,
  downloadItemsAsZip,
  downloadItems,
  showErrorNotification,
}: RetryDownloadArgs): RetryDownload => {
  const retryDownload = useCallback(() => {
    const { item, taskId } = notification;
    const isZipAndMultipleItems = item && 'items' in item && item?.items && item?.type === 'zip';
    const hasOneItemAndTaskID = item && taskId;

    if (isZipAndMultipleItems) {
      downloadItemsAsZip(item.items as DriveItemData[], taskId);
    } else if (hasOneItemAndTaskID) {
      downloadItems(item as DriveItemData, taskId);
    } else {
      showErrorNotification();
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
  uploadSharedItem: (data: {
    uploadFile: File;
    parentFolderId: number;
    taskId: string;
    fileType: string;
    sharedItemAuthenticationData: SharedItemAuthenticationData;
  }) => void;
  showErrorNotification: () => void;
};

export const useRetryUpload = ({
  notification,
  uploadFolder,
  uploadItem,
  uploadSharedItem,
  showErrorNotification,
}: RetryUploadArgs): RetryUpload => {
  const retryUpload = useCallback(() => {
    const { item, taskId, action, sharedItemAuthenticationData } = notification;

    const isFolderUpload = action === TaskType.UploadFolder;

    if (isFolderUpload) {
      const uploadFolderData: UploadFolderData | undefined = notification?.item as UploadFolderData;
      const folder = uploadFolderData?.folder;
      const currentFolderId = uploadFolderData?.parentFolderId;

      if (folder && currentFolderId) {
        uploadFolder({
          folder,
          parentFolderId: currentFolderId,
          taskId,
        });
      } else {
        showErrorNotification();
      }
    } else if (item && taskId) {
      const uploadItemData = item as { uploadFile: File; parentFolderId: number };

      const isSharedItem = !!sharedItemAuthenticationData;
      if (isSharedItem) {
        uploadSharedItem({
          uploadFile: uploadItemData.uploadFile,
          parentFolderId: uploadItemData.parentFolderId,
          taskId: notification.taskId,
          fileType: notification.fileType as string,
          sharedItemAuthenticationData,
        });
      } else {
        uploadItem({
          uploadFile: uploadItemData.uploadFile,
          parentFolderId: uploadItemData.parentFolderId,
          taskId: notification.taskId,
          fileType: notification.fileType as string,
        });
      }
    } else {
      showErrorNotification();
    }
  }, [notification]);

  return { retryUpload };
};
