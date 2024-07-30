import { useCallback } from 'react';
import { DriveItemData } from '../../drive/types';
import {
  DownloadFileTask,
  DownloadFilesData,
  SharedItemAuthenticationData,
  TaskData,
  TaskNotification,
  TaskType,
  UploadFolderData,
} from '../types';

interface RetryDownload {
  retryDownload: () => void;
}

type RetryDownloadArgs = {
  notification: TaskNotification;
  task?: TaskData;
  downloadItemsAsZip: (items: DriveItemData[], existingTaskId: string) => void;
  downloadItems: (item: DriveItemData, existingTaskId: string) => void;
  showErrorNotification: () => void;
  resetProgress: (notification: TaskNotification) => void;
};

export const useRetryDownload = ({
  notification,
  task,
  downloadItemsAsZip,
  downloadItems,
  showErrorNotification,
  resetProgress,
}: RetryDownloadArgs): RetryDownload => {
  const retryDownload = useCallback(() => {
    const { taskId } = notification;
    const folder = task?.folder;
    const isOneFileDownload = !!(task as DownloadFileTask)?.file?.uuid;
    const isZipAndMultipleItems = task?.file && (task?.file as DownloadFilesData)?.items && task?.file?.type === 'zip';

    if (folder) {
      downloadItems(folder as DriveItemData, taskId);
      resetProgress(notification);
    } else if (isZipAndMultipleItems && task.file && (task.file as DownloadFilesData)?.items) {
      resetProgress(notification);
      downloadItemsAsZip((task?.file as DownloadFilesData)?.items as DriveItemData[], taskId);
    } else if (isOneFileDownload) {
      resetProgress(notification);
      downloadItems(task?.file as DriveItemData, taskId);

      showErrorNotification();
    }
  }, [notification, task, downloadItemsAsZip, downloadItems, showErrorNotification, resetProgress]);

  return { retryDownload };
};

interface RetryUpload {
  retryUpload: () => void;
}

type RetryUploadArgs = {
  notification: TaskNotification;
  uploadFolder: (data: UploadFolderData & { taskId: string }) => void;
  uploadItem: (data: { uploadFile: File; parentFolderId: string; taskId: string; fileType: string }) => void;
  uploadSharedItem: (data: {
    uploadFile: File;
    parentFolderId: string;
    taskId: string;
    fileType: string;
    sharedItemAuthenticationData: SharedItemAuthenticationData;
  }) => void;
  showErrorNotification: () => void;
  resetProgress: (notification: TaskNotification) => void;
};

export const useRetryUpload = ({
  notification,
  uploadFolder,
  uploadItem,
  uploadSharedItem,
  showErrorNotification,
  resetProgress,
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
      const uploadItemData = item as { uploadFile: File; parentFolderId: string };

      const isSharedItem = !!sharedItemAuthenticationData;
      if (isSharedItem) {
        resetProgress(notification);
        uploadSharedItem({
          uploadFile: uploadItemData.uploadFile,
          parentFolderId: uploadItemData.parentFolderId,
          taskId: notification.taskId,
          fileType: notification.fileType as string,
          sharedItemAuthenticationData,
        });
      } else {
        resetProgress(notification);
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
