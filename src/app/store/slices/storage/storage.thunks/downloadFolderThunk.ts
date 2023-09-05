import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { RootState } from '../../..';
import errorService from 'app/core/services/error.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { t } from 'i18next';
import { TaskStatus } from 'app/tasks/types';
import tasksService from 'app/tasks/services/tasks.service';
import AppError from 'app/core/types';
import { DriveFileData, DriveFolderData } from '../../../../drive/types';
import folderService from 'app/drive/services/folder.service';
import downloadFolderUsingBlobs from '../../../../drive/services/download.service/downloadFolder/downloadFolderUsingBlobs';
import { isFirefox } from 'react-device-detect';
import { ConnectionLostError } from '../../../../network/requests';
import { Iterator } from 'app/core/collections';

interface DownloadFolderThunkOptions {
  taskId: string;
  showNotifications?: boolean;
  showErrors?: boolean;
}

interface DownloadFolderThunkPayload {
  folder: DriveFolderData;
  fileIterator: (directoryId: number) => Iterator<DriveFileData>;
  folderIterator: (directoryId: number) => Iterator<DriveFolderData>;
  options: DownloadFolderThunkOptions;
}

const defaultDownloadFolderThunkOptions = {
  showNotifications: true,
  showErrors: true,
};

// TODO: Enable compatibility for this functionality on Teams
export const downloadFolderThunk = createAsyncThunk<void, DownloadFolderThunkPayload, { state: RootState }>(
  'storage/downloadFolder',
  async (payload: DownloadFolderThunkPayload, { rejectWithValue }) => {
    const folder = payload.folder;
    const options = { ...defaultDownloadFolderThunkOptions, ...payload.options };
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
          stop: async () => abort(),
        },
      });

      if (isFirefox) {
        await downloadFolderUsingBlobs({ folder, updateProgressCallback });
      } else {
        await folderService.downloadFolderAsZip(
          folder.id,
          folder.name,
          payload.folderIterator,
          payload.fileIterator,
          (progress) => {
            updateProgressCallback(progress);
          },
        );
      }

      tasksService.updateTask({
        taskId: options.taskId,
        merge: {
          status: TaskStatus.Success,
        },
      });
    } catch (err) {
      if (err instanceof ConnectionLostError) {
        return tasksService.updateTask({
          taskId: options.taskId,
          merge: { status: TaskStatus.Error, subtitle: t('error.connectionLostError') as string },
        });
      }
      if (abortController.signal.aborted) {
        return tasksService.updateTask({
          taskId: options.taskId,
          merge: {
            status: TaskStatus.Cancelled,
          },
        });
      }

      (abortController as { abort: (message: string) => void }).abort((err as Error).message);

      errorService.reportError(err, {
        extra: { folder: folder.name, bucket: folder.bucket, folderParentId: folder.parentId },
      });

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
          text: t('error.downloadingFolder', { message: errorMessage || '' }),
          type: ToastType.Error,
        });
      }
    });
};
