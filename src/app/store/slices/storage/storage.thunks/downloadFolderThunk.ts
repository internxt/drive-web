import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { RootState } from '../../..';
import { sessionSelectors } from '../../session/session.selectors';
import downloadService from 'app/drive/services/download.service';
import errorService from 'app/core/services/error.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import i18n from 'app/i18n/services/i18n.service';
import { TaskStatus } from 'app/tasks/types';
import tasksService from 'app/tasks/services/tasks.service';
import AppError from 'app/core/types';
import { DriveFolderData } from 'app/drive/types';
import downloadFolderUsingBlobs from 'app/drive/services/download.service/downloadFolder/downloadFolderUsingBlobs';

interface DownloadFolderThunkOptions {
  taskId: string;
  showNotifications?: boolean;
  showErrors?: boolean;
}

interface DownloadFolderThunkPayload {
  folder: DriveFolderData;
  options: DownloadFolderThunkOptions;
}

const defaultDownloadFolderThunkOptions = {
  showNotifications: true,
  showErrors: true,
};

export const downloadFolderThunk = createAsyncThunk<void, DownloadFolderThunkPayload, { state: RootState }>(
  'storage/downloadFolder',
  async (payload: DownloadFolderThunkPayload, { getState, rejectWithValue }) => {
    const folder = payload.folder;
    const options = { ...defaultDownloadFolderThunkOptions, ...payload.options };
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

    // ! Prevents the folder download to start if the task is already cancelled
    if (task?.status === TaskStatus.Cancelled) {
      return;
    }

    tasksService.updateTask({
      taskId: options.taskId,
      merge: {
        status: TaskStatus.Decrypting,
        cancellable: false,
      },
    });

    const abortController = new AbortController();

    try {
      const abort = () => {
        (abortController as { abort: (message: string) => void }).abort('Download cancelled');
      };

      tasksService.updateTask({
        taskId: options.taskId,
        merge: {
          cancellable: true,
          stop: async () => abort()
        },
      });

      if (navigator.brave?.isBrave()) {
        await downloadFolderUsingBlobs({ folder, updateProgressCallback, isTeam });
      } else {
        await downloadService.downloadFolder({ folder, updateProgressCallback, isTeam, abortController });
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
            status: TaskStatus.Cancelled
          }
        });
      }

      (abortController as { abort: (message: string) => void }).abort((err as Error).message);

      const castedError = errorService.castError(err);
      const task = tasksService.findTask(options.taskId);

      if (task?.status !== TaskStatus.Cancelled) {
        tasksService.updateTask({
          taskId: options.taskId,
          merge: {
            status: TaskStatus.Error,
          },
        });

        rejectWithValue(castedError);
      }
    }
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

        notificationsService.show({
          text: i18n.get('error.downloadingFolder', { message: errorMessage || '' }),
          type: ToastType.Error,
        });
      }
    });
};
