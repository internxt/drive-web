import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { DriveItemData } from '../../drive/types';
import {
  downloadItemsAsZipThunk,
  downloadItemsThunk,
} from '../../store/slices/storage/storage.thunks/downloadItemsThunk';
import { TaskNotification, TaskType } from '../types';
import { createFilesIterator, createFoldersIterator } from '../../drive/services/folder.service';
import { uploadItemsThunk } from '../../store/slices/storage/storage.thunks/uploadItemsThunk';
import { IRoot, uploadFolderThunk } from '../../store/slices/storage/storage.thunks/uploadFolderThunk';

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
      const folder = notification?.folderToUpload?.folder;
      const currentFolderId = notification?.folderToUpload?.parentFolderId;
      if (folder && currentFolderId)
        dispatch(
          uploadFolderThunk({
            root: notification?.folderToUpload?.folder as IRoot,
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
    }
  }, [notification, dispatch]);

  return { retryUpload };
};
