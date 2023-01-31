import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { RootState } from '../../..';
import { sessionSelectors } from '../../session/session.selectors';
import downloadService from 'app/drive/services/download.service';
import tasksService from 'app/tasks/services/tasks.service';
import { DriveFileData } from 'app/drive/types';
import AppError from 'app/core/types';
import { get } from 'app/i18n/services/i18n.service';
import errorService from 'app/core/services/error.service';
import { TaskStatus } from 'app/tasks/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { LRUFilesCacheManager } from '../../../../database/services/database.service/LRUFilesCacheManager';
import { saveAs } from 'file-saver';
import dateService from '../../../../core/services/date.service';
import { DriveItemBlobData } from '../../../../database/services/database.service';

interface DownloadFileThunkOptions {
  taskId: string;
  showNotifications?: boolean;
  showErrors?: boolean;
}

interface DownloadFileThunkPayload {
  file: DriveFileData;
  options: DownloadFileThunkOptions;
}

const defaultDownloadFileThunkOptions = {
  showNotifications: true,
  showErrors: true,
};

const checkIfCachedSourceIsOlder = ({
  cachedFile,
  file,
}: {
  cachedFile: DriveItemBlobData | undefined;
  file: DriveFileData;
}) => {
  const isCachedFileOlder = !cachedFile?.updatedAt
    ? true
    : dateService.isDateOneBefore({
        dateOne: cachedFile?.updatedAt as string,
        dateTwo: file?.updatedAt as string,
      });

  return isCachedFileOlder;
};

export const downloadFileThunk = createAsyncThunk<void, DownloadFileThunkPayload, { state: RootState }>(
  'storage/downloadFile',
  async (payload: DownloadFileThunkPayload, { getState, rejectWithValue }) => {
    const file = payload.file;
    const options = { ...defaultDownloadFileThunkOptions, ...payload.options };
    const isTeam: boolean = sessionSelectors.isTeam(getState());
    const task = tasksService.findTask(options.taskId);
    const updateProgressCallback = (progress: number) => {
      if (task?.status !== TaskStatus.Cancelled) {
        tasksService.updateTask({
          taskId: options.taskId,
          merge: {
            status: TaskStatus.InProcess,
            progress,
          },
        });
      }
    };

    // ! Prevents the file download start if the task is already cancelled
    if (task?.status === TaskStatus.Cancelled) {
      return;
    }

    const abortController = new AbortController();

    try {
      tasksService.updateTask({
        taskId: options.taskId,
        merge: {
          status: TaskStatus.Decrypting,
          stop: async () => (abortController as { abort: (reason?: string) => void }).abort('Download cancelled'),
        },
      });

      const lruFilesCacheManager = await LRUFilesCacheManager.getInstance();
      const cachedFile = await lruFilesCacheManager.get(file.id.toString());
      const isCachedFileOlder = checkIfCachedSourceIsOlder({ cachedFile, file });

      if (cachedFile?.source && !isCachedFileOlder) {
        updateProgressCallback(100);
        const completeFileName = file.type ? `${file.name}.${file.type}` : file.name;
        saveAs(cachedFile?.source, completeFileName);
      } else {
        await downloadService.downloadFile(file, isTeam, updateProgressCallback, abortController);
      }

      tasksService.updateTask({
        taskId: options.taskId,
        merge: {
          status: TaskStatus.Success,
        },
      });
    } catch (err) {
      if (abortController.signal.aborted) {
        return tasksService.updateTask({
          taskId: options.taskId,
          merge: {
            status: TaskStatus.Cancelled,
          },
        });
      }

      const castedError = errorService.castError(err);

      tasksService.updateTask({
        taskId: options.taskId,
        merge: {
          status: TaskStatus.Error,
        },
      });

      rejectWithValue(castedError);
    }
  },
);

export const downloadFileThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(downloadFileThunk.pending, () => undefined)
    .addCase(downloadFileThunk.fulfilled, () => undefined)
    .addCase(downloadFileThunk.rejected, (state, action) => {
      const options = { ...defaultDownloadFileThunkOptions, ...action.meta.arg.options };
      const rejectedValue = action.payload as AppError;

      if (options.showErrors) {
        const errorMessage = rejectedValue?.message || action.error.message;

        notificationsService.show({
          text: get('error.downloadingFile', { message: errorMessage || '' }),
          type: ToastType.Error,
        });
      }
    });
};
