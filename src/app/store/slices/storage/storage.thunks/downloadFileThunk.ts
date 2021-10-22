import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { RootState } from '../../..';
import { sessionSelectors } from '../../session/session.selectors';
import downloadService from 'app/drive/services/download.service';
import tasksService from 'app/tasks/services/tasks.service';
import { DriveFileData } from 'app/drive/types';
import AppError from 'app/core/types';
import i18n from 'app/i18n/services/i18n.service';
import errorService from 'app/core/services/error.service';
import { TaskStatus } from 'app/tasks/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';

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

    const [downloadFilePromise, actionState] = downloadService.downloadFile(file, isTeam, updateProgressCallback);

    tasksService.updateTask({
      taskId: options.taskId,
      merge: {
        status: TaskStatus.Decrypting,
        stop: async () => actionState?.stop(),
      },
    });

    downloadFilePromise
      .then(() => {
        tasksService.updateTask({
          taskId: options.taskId,
          merge: {
            status: TaskStatus.Success,
          },
        });
      })
      .catch((err: unknown) => {
        const castedError = errorService.castError(err);

        if (task?.status !== TaskStatus.Cancelled) {
          tasksService.updateTask({
            taskId: options.taskId,
            merge: {
              status: TaskStatus.Error,
            },
          });

          rejectWithValue(castedError);
        }
      });

    await downloadFilePromise;
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

        notificationsService.show(i18n.get('error.downloadingFile', { message: errorMessage || '' }), ToastType.Error);
      }
    });
};
