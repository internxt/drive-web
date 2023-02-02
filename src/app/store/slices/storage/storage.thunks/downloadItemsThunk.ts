import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import storageThunks from '.';
import { StorageState } from '../storage.model';
import { RootState } from '../../..';
import { DriveFileData, DriveFolderData, DriveItemData } from 'app/drive/types';
import i18n from 'app/i18n/services/i18n.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { DownloadFileTask, DownloadFolderTask, TaskStatus, TaskType } from 'app/tasks/types';
import tasksService from 'app/tasks/services/tasks.service';
import errorService from 'app/core/services/error.service';
import folderService from 'app/drive/services/folder.service';
import { downloadFile } from 'app/network/download';
import localStorageService from 'app/core/services/local-storage.service';
import { FlatFolderZip } from 'app/core/services/zip.service';
import date from 'app/core/services/date.service';
import { LRUFilesCacheManager } from 'app/database/services/database.service/LRUFilesCacheManager';
import { checkIfCachedSourceIsOlder } from './downloadFileThunk';
import { updateDatabaseFileSourceData } from 'app/drive/services/database.service';
import { binaryStreamToBlob } from 'app/core/services/stream.service';

export const downloadItemsThunk = createAsyncThunk<void, DriveItemData[], { state: RootState }>(
  'storage/downloadItems',
  async (items: DriveItemData[], { dispatch, requestId, rejectWithValue }) => {
    if (items.length > 1) {
      await dispatch(downloadItemsAsZipThunk(items));
      return;
    }
    const errors: unknown[] = [];
    const taskGroupId = requestId;
    const tasksIds: string[] = [];

    // * 1. Creates tasks
    for (const item of items) {
      if (item.isFolder) {
        const taskId = tasksService.create<DownloadFolderTask>({
          action: TaskType.DownloadFolder,
          relatedTaskId: taskGroupId,
          folder: item,
          compressionFormat: 'zip',
          showNotification: true,
          cancellable: true,
        });

        tasksIds.push(taskId);
      } else {
        const taskId = tasksService.create<DownloadFileTask>({
          action: TaskType.DownloadFile,
          file: item,
          showNotification: true,
          cancellable: true,
          relatedTaskId: taskGroupId,
        });

        tasksIds.push(taskId);
      }
    }

    // * 2. Executes tasks
    for (const [index, item] of items.entries()) {
      const taskId = tasksIds[index];

      if (item.isFolder) {
        await dispatch(
          storageThunks.downloadFolderThunk({
            folder: item as DriveFolderData,
            options: { taskId },
          }),
        );
      } else {
        await dispatch(
          storageThunks.downloadFileThunk({
            file: item as DriveFileData,
            options: { taskId },
          }),
        );
      }
    }

    if (errors.length > 0) {
      return rejectWithValue(errors);
    }
  },
);

export const downloadItemsAsZipThunk = createAsyncThunk<void, DriveItemData[], { state: RootState }>(
  'storage/downloadItemsAsZip',
  async (items: DriveItemData[], { rejectWithValue }) => {
    const errors: unknown[] = [];
    const lruFilesCacheManager = await LRUFilesCacheManager.getInstance();
    const downloadProgress: number[] = [];
    const abortController = new AbortController();
    const formattedDate = date.format(new Date(), 'DD/MM/YYYY - HH:mm');
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
          let fileStream: ReadableStream<Uint8Array> | null = null;
          const cachedFile = await lruFilesCacheManager.get(driveItem.id.toString());
          const isCachedFileOlder = checkIfCachedSourceIsOlder({ cachedFile, file: driveItem });

          if (cachedFile?.source && !isCachedFileOlder) {
            const blob = cachedFile.source as Blob;
            downloadProgress[index] = 1;
            fileStream = blob.stream();
          } else {
            const downloadedFileStream = await downloadFile({
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
            const sourceBlob = await binaryStreamToBlob(downloadedFileStream);
            await updateDatabaseFileSourceData({
              folderId: driveItem.folderId,
              sourceBlob,
              fileId: driveItem.id,
              updatedAt: driveItem.updatedAt,
            });

            fileStream = sourceBlob.stream();
          }

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
