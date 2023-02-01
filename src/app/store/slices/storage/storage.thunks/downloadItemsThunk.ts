import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';
import { StorageState } from '../storage.model';
import { RootState } from '../../..';
import i18n from 'app/i18n/services/i18n.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import date from 'app/core/services/date.service';
import { FlatFolderZip } from 'app/core/services/zip.service';
import { downloadFile } from 'app/network/download';
import { DriveItemData } from 'app/drive/types';
import localStorageService from 'app/core/services/local-storage.service';
import tasksService from 'app/tasks/services/tasks.service';
import { DownloadFileTask, TaskStatus, TaskType } from 'app/tasks/types';
import folderService from 'app/drive/services/folder.service';
import errorService from 'app/core/services/error.service';

export const downloadItemsThunk = createAsyncThunk<void, DriveItemData[], { state: RootState }>(
  'storage/downloadItems',
  async (items: DriveItemData[], { rejectWithValue }) => {
    const errors: unknown[] = [];
    const downloadProgress: number[] = [];
    const abortController = new AbortController();
    const formattedDate = date.format(new Date(), 'DD/MM/YYYY - HH:MM');
    const folderName = `Internxt (${formattedDate})`;
    const folder = new FlatFolderZip(folderName, {});

    const user = localStorageService.getUser();
    if (!user) throw new Error('User not found');

    const taskId = tasksService.create<DownloadFileTask>({
      action: TaskType.DownloadFile,

      showNotification: true,
      stop: async () => {
        abortController.abort();
        folder.abort();
      },
      cancellable: true,

      file: {
        name: folderName,
        type: 'zip',
      },
    });

    tasksService.updateTask({
      taskId,
      merge: {
        status: TaskStatus.InProcess,
      },
    });

    const calculateProgress = () => {
      const totalProgress = downloadProgress.reduce((previous, current) => {
        return previous + current;
      });

      return totalProgress / downloadProgress.length;
    };

    const updateProgressCallback = (progress: number) => {
      tasksService.updateTask({
        taskId,
        merge: {
          progress,
        },
      });
    };

    items.forEach((_, index) => {
      downloadProgress[index] = 0;
    });

    for (const [index, driveItem] of items.entries()) {
      try {
        if (driveItem.isFolder) {
          await folderService.downloadFolderAsZip(
            driveItem.id,
            driveItem.name,
            (progress) => {
              downloadProgress[index] = progress;
              updateProgressCallback(calculateProgress());
            },
            { destination: folder, closeWhenFinished: false },
          );
          downloadProgress[index] = 1;
        } else {
          const fileStream = await downloadFile({
            fileId: driveItem.fileId,
            bucketId: driveItem.bucket,
            creds: {
              user: user.bridgeUser,
              pass: user.userId,
            },
            mnemonic: user.mnemonic,
            options: {
              abortController,
              notifyProgress: (totalBytes, downloadedBytes) => {
                const progress = downloadedBytes / totalBytes;

                downloadProgress[index] = progress;

                updateProgressCallback(calculateProgress());
              },
            },
          });

          folder.addFile(`${driveItem.name}.${driveItem.type}`, fileStream);
        }
      } catch (e) {
        errorService.reportError(e);
        errors.push(e);
      }
    }

    if (errors.length > 0) {
      tasksService.updateTask({
        taskId,
        merge: {
          status: TaskStatus.Error,
        },
      });
      await folder.abort();
      return rejectWithValue(errors);
    } else {
      await folder.close();
      tasksService.updateTask({
        taskId,
        merge: {
          status: TaskStatus.Success,
        },
      });
    }
  },
);

export const downloadItemsThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(downloadItemsThunk.pending, () => undefined)
    .addCase(downloadItemsThunk.fulfilled, () => undefined)
    .addCase(downloadItemsThunk.rejected, (state, action) => {
      const errors = action.payload as unknown[];

      if (errors && errors.length > 0) {
        notificationsService.show({ text: i18n.get('error.downloadingItems'), type: ToastType.Error });
      } else {
        notificationsService.show({
          text: i18n.get('error.downloadingFile', { reason: action.error.message || '' }),
          type: ToastType.Error,
        });
      }
    });
};
