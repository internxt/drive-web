import { useCallback } from 'react';
import { DriveItemData } from 'app/drive/types';
import { DownloadFileTask, DownloadFilesData, TaskData, TaskNotification } from '../types';
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
