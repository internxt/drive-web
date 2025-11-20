import { useCallback } from 'react';
import { DriveItemData } from 'app/drive/types';
import {
  DownloadFileTask,
  DownloadFilesData,
  SharedItemAuthenticationData,
  TaskData,
  TaskNotification,
  TaskType,
  UploadFolderData,
} from '../types';
import { DownloadManager } from '../../network/DownloadManager';
import { WorkspaceCredentialsDetails, WorkspaceData } from '@internxt/sdk/dist/workspaces';

interface RetryDownload {
  retryDownload: () => void;
}

type RetryDownloadArgs = {
  notification: TaskNotification;
  task?: TaskData;
  showErrorNotification: () => void;
  resetProgress: (notification: TaskNotification) => void;
  selectedWorkspace: WorkspaceData | null;
  workspaceCredentials: WorkspaceCredentialsDetails | null;
};

export const useRetryDownload = ({
  notification,
  task,
  showErrorNotification,
  resetProgress,
  selectedWorkspace,
  workspaceCredentials,
}: RetryDownloadArgs): RetryDownload => {
  const retryDownload = useCallback(() => {
    const { taskId } = notification;
    const folder = task?.folder;
    const isOneFileDownload = !!(task as DownloadFileTask)?.file?.uuid;
    const isZipAndMultipleItems = task?.file && (task?.file as DownloadFilesData)?.items && task?.file?.type === 'zip';

    if (folder) {
      DownloadManager.downloadItem({
        payload: [folder as DriveItemData],
        selectedWorkspace,
        workspaceCredentials,
        taskId,
      });
      resetProgress(notification);
    } else if (isZipAndMultipleItems && task.file && (task.file as DownloadFilesData)?.items) {
      DownloadManager.downloadItem({
        payload: (task?.file as DownloadFilesData)?.items as DriveItemData[],
        selectedWorkspace,
        workspaceCredentials,
        taskId,
      });
      resetProgress(notification);
    } else if (isOneFileDownload) {
      DownloadManager.downloadItem({
        payload: [task?.file as DriveItemData],
        selectedWorkspace,
        workspaceCredentials,
        taskId,
      });
      resetProgress(notification);
      showErrorNotification();
    }
  }, [notification, task, showErrorNotification, resetProgress, selectedWorkspace, workspaceCredentials]);

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
