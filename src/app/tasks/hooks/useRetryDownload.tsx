import { useCallback } from 'react';
import { DriveItemData } from '../../drive/types';
import {
  downloadItemsAsZipThunk,
  downloadItemsThunk,
} from '../../store/slices/storage/storage.thunks/downloadItemsThunk';
import { TaskNotification } from '../types';
import { createFilesIterator, createFoldersIterator } from '../../drive/services/folder.service';
import { useAppDispatch } from 'app/store/hooks';

interface RetryDownload {
  retryDownload: () => void;
}

export const useRetryDownload = (notification: TaskNotification): RetryDownload => {
  const dispatch = useAppDispatch();

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
