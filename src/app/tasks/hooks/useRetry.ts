import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { DriveItemData } from '../../drive/types';
import {
  downloadItemsAsZipThunk,
  downloadItemsThunk,
} from '../../store/slices/storage/storage.thunks/downloadItemsThunk';
import { TaskNotification, TaskType, UploadFolderData } from '../types';
import { createFilesIterator, createFoldersIterator } from '../../drive/services/folder.service';
import { uploadItemsThunk } from '../../store/slices/storage/storage.thunks/uploadItemsThunk';
import { uploadFolderThunk } from '../../store/slices/storage/storage.thunks/uploadFolderThunk';
import notificationsService, { ToastType } from '../../notifications/services/notifications.service';
import { t } from 'i18next';

interface RetryDownload {
  retryDownload: () => void;
}

export const useRetryDownload = (notification: TaskNotification): RetryDownload => {
  const dispatch = useDispatch();

  const retryDownload = useCallback(() => {
    const { item, taskId } = notification;
    const isZipAndMultipleItems = item && 'items' in item && item?.items && item?.type === 'zip';

    if (isZipAndMultipleItems) {
      dispatch(
        downloadItemsAsZipThunk({
          items: item.items as DriveItemData[],
          existingTaskId: taskId,
          fileIterator: createFilesIterator,
          folderIterator: createFoldersIterator,
        }),
      );
    } else if (item && taskId) {
      dispatch(downloadItemsThunk([{ ...(item as DriveItemData), taskId }]));
    }
  }, [notification, dispatch]);

  return { retryDownload };
};

interface RetryUpload {
  retryUpload: () => void;
}

export const useRetryUpload = (notification: TaskNotification): RetryUpload => {
  const dispatch = useDispatch();

  const retryUpload = useCallback(() => {
    const { item, taskId, action } = notification;
    const isFolderUpload = action === TaskType.UploadFolder;

    if (isFolderUpload) {
      const uploadFolderData: UploadFolderData | undefined = notification?.item as UploadFolderData;
      const folder = uploadFolderData?.folder;
      const currentFolderId = uploadFolderData?.parentFolderId;

      if (folder && currentFolderId)
        dispatch(
          uploadFolderThunk({
            root: folder,
            currentFolderId: currentFolderId,
            options: {
              taskId,
            },
          }),
        );
    } else if (item && taskId) {
      const uploadItem = item as { uploadFile: File; parentFolderId: number };
      dispatch(
        uploadItemsThunk({
          files: [uploadItem.uploadFile],
          parentFolderId: uploadItem.parentFolderId,
          taskId: notification.taskId,
          fileType: notification.fileType,
        }),
      );
    } else {
      notificationsService.show({ text: t('tasks.generalErrorMessages.retryUploadFailed'), type: ToastType.Error });
    }
  }, [notification, dispatch]);

  return { retryUpload };
};
