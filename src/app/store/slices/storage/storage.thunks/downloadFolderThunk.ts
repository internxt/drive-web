import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { RootState } from '../../..';
import { sessionSelectors } from '../../session/session.selectors';
import downloadService from '../../../../drive/services/download.service';
import errorService from '../../../../core/services/error.service';
import notificationsService, { ToastType } from '../../../../notifications/services/notifications.service';
import i18n from '../../../../i18n/services/i18n.service';
import { DownloadFolderTask, TaskProgress, TaskStatus, TaskType } from '../../../../tasks/types';
import tasksService from '../../../../tasks/services/tasks.service';
import AppError from '../../../../core/types';
import { DriveFolderData } from '../../../../drive/types';

interface DownloadFolderThunkOptions {
  relatedTaskId: string;
  showNotifications: boolean;
  showErrors: boolean;
}

interface DownloadFolderThunkPayload {
  folder: DriveFolderData;
  options: Partial<DownloadFolderThunkOptions>;
}

const defaultDownloadFolderThunkOptions = {
  showNotifications: true,
  showErrors: true,
};

export const downloadFolderThunk = createAsyncThunk<void, DownloadFolderThunkPayload, { state: RootState }>(
  'storage/downloadFolder',
  async (payload: DownloadFolderThunkPayload, { getState, requestId, rejectWithValue }) => {
    const folder = payload.folder;
    const options = { ...defaultDownloadFolderThunkOptions, ...payload.options };
    const isTeam: boolean = sessionSelectors.isTeam(getState());
    const taskId = requestId;
    const task: DownloadFolderTask = {
      id: taskId,
      relatedTaskId: options.relatedTaskId,
      action: TaskType.DownloadFolder,
      status: TaskStatus.Pending,
      progress: TaskProgress.Min,
      folder,
      compressionFormat: 'zip',
      showNotification: options.showNotifications,
      cancellable: true,
    };
    const decryptedCallback = () => {
      tasksService.updateTask({
        taskId,
        merge: {
          status: TaskStatus.InProcess,
        },
      });
    };
    const updateProgressCallback = (progress: number) => {
      const task = tasksService.findTask(taskId);

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
    const errorCallback = (err: Error) => {
      console.log('errorCallback: ', err);
      throw err;
    };

    tasksService.addTask(task);

    tasksService.updateTask({
      taskId,
      merge: {
        status: TaskStatus.Decrypting,
      },
    });

    const downloadFolderPromise = downloadService.downloadFolder({
      folder,
      decryptedCallback,
      updateProgressCallback,
      errorCallback,
      isTeam,
    });

    downloadFolderPromise
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

    await downloadFolderPromise;
  },
);

export const downloadFolderThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(downloadFolderThunk.pending, () => undefined)
    .addCase(downloadFolderThunk.fulfilled, () => undefined)
    .addCase(downloadFolderThunk.rejected, (state, action) => {
      const options = { ...defaultDownloadFolderThunkOptions, ...action.meta.arg.options };
      const rejectedValue = action.payload as AppError;

      if (options.showErrors) {
        const errorMessage = rejectedValue?.message || action.error.message;

        notificationsService.show(
          i18n.get('error.downloadingFolder', { message: errorMessage || '' }),
          ToastType.Error,
        );
      }
    });
};
