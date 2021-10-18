import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { RootState } from '../../..';
import { sessionSelectors } from '../../session/session.selectors';
import downloadService from '../../../../drive/services/download.service';
import tasksService from '../../../../tasks/services/tasks.service';
import { DriveFileData } from '../../../../drive/types';
import AppError from '../../../../core/types';
import i18n from '../../../../i18n/services/i18n.service';
import errorService from '../../../../core/services/error.service';
import { DownloadFileTask, TaskProgress, TaskStatus, TaskType } from '../../../../tasks/types';
import notificationsService, { ToastType } from '../../../../notifications/services/notifications.service';

interface DownloadFileThunkOptions {
  relatedTaskId: string;
  showNotifications: boolean;
  showErrors: boolean;
}

interface DownloadFileThunkPayload {
  file: DriveFileData;
  options: Partial<DownloadFileThunkOptions>;
}

const defaultDownloadFileThunkOptions = {
  showNotifications: true,
  showErrors: true,
};

export const downloadFileThunk = createAsyncThunk<void, DownloadFileThunkPayload, { state: RootState }>(
  'storage/downloadFile',
  async (payload: DownloadFileThunkPayload, { getState, requestId, rejectWithValue }) => {
    const file = payload.file;
    const options = { ...defaultDownloadFileThunkOptions, ...payload.options };
    const isTeam: boolean = sessionSelectors.isTeam(getState());
    const taskId = requestId;
    const task: DownloadFileTask = {
      id: taskId,
      action: TaskType.DownloadFile,
      status: TaskStatus.Pending,
      progress: TaskProgress.Min,
      file,
      showNotification: options.showNotifications,
      cancellable: true,
      relatedTaskId: options.relatedTaskId,
    };
    const updateProgressCallback = (progress: number) => {
      if (task?.status !== TaskStatus.Cancelled) {
        tasksService.updateTask({
          taskId,
          merge: {
            status: TaskStatus.InProcess,
            progress,
          },
        });
      }
    };

    tasksService.addTask(task);

    const [downloadFilePromise, actionState] = downloadService.downloadFile(file, isTeam, updateProgressCallback);

    tasksService.updateTask({
      taskId,
      merge: {
        status: TaskStatus.Decrypting,
        stop: async () => actionState?.stop(),
      },
    });

    downloadFilePromise
      .then(() => {
        tasksService.updateTask({
          taskId,
          merge: {
            status: TaskStatus.Success,
          },
        });
      })
      .catch((err: unknown) => {
        const castedError = errorService.castError(err);
        const task = tasksService.findTask(taskId);

        if (task?.status !== TaskStatus.Cancelled) {
          tasksService.updateTask({
            taskId,
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
