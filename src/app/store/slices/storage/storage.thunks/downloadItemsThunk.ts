import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import storageThunks from '.';
import { StorageState } from '../storage.model';
import { RootState } from '../../..';
import { DriveFileData, DriveFolderData, DriveItemData } from 'app/drive/types';
import { t } from 'i18next';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { DownloadFileTask, DownloadFolderTask, TaskStatus, TaskType } from 'app/tasks/types';
import tasksService from 'app/tasks/services/tasks.service';
import errorService from 'app/core/services/error.service';
import folderService, { createFilesIterator, createFoldersIterator } from '../../../../drive/services/folder.service';
import { downloadFile } from 'app/network/download';
import localStorageService from 'app/core/services/local-storage.service';
import { FlatFolderZip } from 'app/core/services/zip.service';
import date from 'app/core/services/date.service';
import { LRUFilesCacheManager } from 'app/database/services/database.service/LRUFilesCacheManager';
import { checkIfCachedSourceIsOlder } from './downloadFileThunk';
import { updateDatabaseFileSourceData } from 'app/drive/services/database.service';
import { binaryStreamToBlob } from 'app/core/services/stream.service';
import { TrackingPlan } from '../../../../analytics/TrackingPlan';
import analyticsService from '../../../../analytics/services/analytics.service';
import { Iterator } from 'app/core/collections';

type DownloadItemsThunkPayload = (DriveItemData & { taskId?: string })[];

export const downloadItemsThunk = createAsyncThunk<void, DownloadItemsThunkPayload, { state: RootState }>(
  'storage/downloadItems',
  async (items: DownloadItemsThunkPayload, { dispatch, requestId, rejectWithValue }) => {
    if (items.length > 1) {
      await dispatch(
        downloadItemsAsZipThunk({ items, fileIterator: createFilesIterator, folderIterator: createFoldersIterator }),
      );
      return;
    }
    const errors: unknown[] = [];
    const taskGroupId = requestId;
    const tasksIds: string[] = [];

    // * 1. Creates tasks
    for (const item of items) {
      const isRetryDownload = !!item.taskId;

      if (isRetryDownload) {
        tasksIds.push(item.taskId as string);
        tasksService.updateTask({
          taskId: item.taskId as string,
          merge: {
            status: TaskStatus.Decrypting,
          },
        });
      } else {
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
    }

    // * 2. Executes tasks
    for (const [index, item] of items.entries()) {
      const taskId = tasksIds[index];

      if (item.isFolder) {
        await dispatch(
          storageThunks.downloadFolderThunk({
            folder: item as DriveFolderData,
            options: { taskId },
            fileIterator: createFilesIterator,
            folderIterator: createFoldersIterator,
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

type DownloadItemsAsZipThunkType = {
  items: DriveItemData[];
  folderIterator: (directoryId: any) => Iterator<DriveFolderData>;
  fileIterator: (directoryId: any, token?: string) => Iterator<DriveFileData>;
  credentials?: {
    user: string | undefined;
    pass: string | undefined;
  };
  mnemonic?: string;
  existingTaskId?: string;
};

export const downloadItemsAsZipThunk = createAsyncThunk<void, DownloadItemsAsZipThunkType, { state: RootState }>(
  'storage/downloadItemsAsZip',
  async ({ items, credentials, mnemonic, existingTaskId, folderIterator, fileIterator }, { rejectWithValue }) => {
    const errors: unknown[] = [];
    const lruFilesCacheManager = await LRUFilesCacheManager.getInstance();
    const downloadProgress: number[] = [];
    const abortController = new AbortController();
    const formattedDate = date.format(new Date(), 'DD/MM/YYYY - HH:mm');
    const folderName = `Internxt (${formattedDate})`;
    const folder = new FlatFolderZip(folderName, {});

    const moreOptions = {
      credentials,
      mnemonic,
    };

    const user = localStorageService.getUser();
    if (!user) throw new Error('User not found');

    const taskId =
      existingTaskId ||
      tasksService.create<DownloadFileTask>({
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
          items: items,
        },
      });

    tasksService.updateTask({
      taskId,
      merge: {
        status: TaskStatus.InProcess,
        stop: async () => {
          abortController.abort();
          folder.abort();
        },
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
    const analyticsProcessIdentifier = analyticsService.getTrackingActionId();
    let trackingDownloadProperties: TrackingPlan.DownloadProperties = {
      process_identifier: analyticsProcessIdentifier,
      is_multiple: items.length > 1 ? 1 : 0,
      bandwidth: 0,
      band_utilization: 0,
      file_size: 0,
      file_extension: '',
      file_id: 0,
      file_name: '',
      parent_folder_id: 0,
    };
    for (const [index, driveItem] of items.entries()) {
      try {
        if (driveItem.isFolder) {
          await folderService.downloadFolderAsZip(
            driveItem.id,
            driveItem.name,
            folderIterator,
            fileIterator,
            (progress) => {
              downloadProgress[index] = progress;
              updateProgressCallback(calculateProgress());
            },
            { destination: folder, closeWhenFinished: false, ...moreOptions },
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
            trackingDownloadProperties = {
              process_identifier: analyticsProcessIdentifier,
              file_id: typeof driveItem.id === 'string' ? parseInt(driveItem.id) : driveItem.id,
              file_size: driveItem.size,
              file_extension: driveItem.type,
              file_name: driveItem.name,
              parent_folder_id: driveItem.folderId,
              is_multiple: 1,
              bandwidth: 0,
              band_utilization: 0,
            };
            analyticsService.trackFileDownloadStarted(trackingDownloadProperties);

            const downloadedFileStream = await downloadFile({
              fileId: driveItem.fileId,
              bucketId: driveItem.bucket,
              creds: {
                user: credentials?.user || user.bridgeUser,
                pass: credentials?.pass || user.userId,
              },
              mnemonic: mnemonic || user.mnemonic,
              options: {
                abortController,
                notifyProgress: (totalBytes, downloadedBytes) => {
                  const progress = downloadedBytes / totalBytes;

                  downloadProgress[index] = progress;

                  updateProgressCallback(calculateProgress());
                },
              },
            });
            analyticsService.trackFileDownloadCompleted(trackingDownloadProperties);

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
      } catch (error) {
        const castedError = errorService.castError(error);
        if (abortController.signal.aborted) {
          analyticsService.trackFileDownloadAborted({
            ...trackingDownloadProperties,
          });
        } else {
          analyticsService.trackFileDownloadError({
            ...trackingDownloadProperties,
            error_message_user: 'Error downloading file',
            error_message: castedError.message,
            stack_trace: castedError.stack ?? '',
          });
        }
        errorService.reportError(error);
        errors.push(error);
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
        notificationsService.show({ text: t('error.downloadingItems'), type: ToastType.Error });
      } else {
        notificationsService.show({
          text: t('error.downloadingFile', { message: action.error.message || '' }),
          type: ToastType.Error,
        });
      }
    });
};
