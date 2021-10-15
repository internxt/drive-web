import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { RootState } from '../../..';
import { DriveFileData } from '../../../../models/interfaces';
import downloadService from '../../../../services/download.service';
import i18n from '../../../../services/i18n.service';
import notificationsService, { ToastType } from '../../../../services/notifications.service';
import { sessionSelectors } from '../../session/session.selectors';
import errorService from '../../../../services/error.service';
import { TaskProgress, TaskStatus, TaskType } from '../../../../services/task-manager.service/enums';
import AppError from '../../../../models/AppError';
import { DownloadFileTask } from '../../../../services/task-manager.service/interfaces';
import taskManagerService from '../../../../services/task-manager.service';

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
        taskManagerService.updateTask({
          taskId,
          merge: {
            status: TaskStatus.InProcess,
            progress,
          },
        });
      }
    };

    taskManagerService.addTask(task);

    const [downloadFilePromise, actionState] = downloadService.downloadFile(file, isTeam, updateProgressCallback);

    taskManagerService.updateTask({
      taskId,
      merge: {
        status: TaskStatus.Decrypting,
        stop: async () => actionState?.stop(),
      },
    });

    downloadFilePromise
      .then(() => {
        taskManagerService.updateTask({
          taskId,
          merge: {
            status: TaskStatus.Success,
          },
        });
      })
      .catch((err: unknown) => {
        const castedError = errorService.castError(err);
        const task = taskManagerService.findTask(taskId);

        if (task?.status !== TaskStatus.Cancelled) {
          taskManagerService.updateTask({
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
