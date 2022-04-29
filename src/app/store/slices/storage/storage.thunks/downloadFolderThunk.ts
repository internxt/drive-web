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
    const decryptedCallback = () => {
      tasksService.updateTask({
        taskId: options.taskId,
        merge: {
          status: TaskStatus.InProcess,
        },
      });
    };
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

    try {
      const [downloadFolderPromise, stop] = (await downloadService.downloadFolder({
        folder,
        decryptedCallback,
        updateProgressCallback,
        isTeam,
      })) as [Promise<void>, () => void];

      tasksService.updateTask({
        taskId: options.taskId,
        merge: {
          cancellable: true,
          stop: async () => stop(),
        },
      });

      downloadFolderPromise
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
        });

      await downloadFolderPromise;
    } catch (err) {
      tasksService.updateTask({
        taskId: options.taskId,
        merge: {
          status: TaskStatus.Error,
          cancellable: false,
        },
      });

      throw err;
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
