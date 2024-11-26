import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { SharedFiles, SharedFolders } from '@internxt/sdk/dist/drive/share/types';
import { Iterator } from '../../../../core/collections';
import date from '../../../../core/services/date.service';
import errorService from '../../../../core/services/error.service';
import localStorageService from '../../../../core/services/local-storage.service';
import { binaryStreamToBlob } from '../../../../core/services/stream.service';
import { FlatFolderZip } from '../../../../core/services/zip.service';
import { LRUFilesCacheManager } from '../../../../database/services/database.service/LRUFilesCacheManager';
import { updateDatabaseFileSourceData } from '../../../../drive/services/database.service';
import { DriveFileData, DriveFolderData, DriveItemData } from '../../../../drive/types';
import { downloadFile } from '../../../../network/download';
import notificationsService, { ToastType } from '../../../../notifications/services/notifications.service';
import tasksService from '../../../../tasks/services/tasks.service';
import { DownloadFileTask, DownloadFilesTask, DownloadFolderTask, TaskStatus, TaskType } from '../../../../tasks/types';
import { t } from 'i18next';
import storageThunks from '.';
import { RootState } from '../../..';
import folderService, { createFilesIterator, createFoldersIterator } from '../../../../drive/services/folder.service';
import workspacesSelectors from '../../workspaces/workspaces.selectors';
import { StorageState } from '../storage.model';
import { checkIfCachedSourceIsOlder } from './downloadFileThunk';

type DownloadItemsThunkPayload = (DriveItemData & {
  taskId?: string;
  sharingOptions?: {
    credentials: { pass: string; user: string };
    mnemonic: string;
  };
})[];

export const downloadItemsThunk = createAsyncThunk<void, DownloadItemsThunkPayload, { state: RootState }>(
  'storage/downloadItems',
  async (items: DownloadItemsThunkPayload, { dispatch, requestId, rejectWithValue, getState }) => {
    const state = getState();
    const selectedWorkspace = workspacesSelectors.getSelectedWorkspace(state);
    const workspaceCredentials = workspacesSelectors.getWorkspaceCredentials(state);

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
        const isSharedFile = !!item.sharingOptions;
        if (isSharedFile && item.sharingOptions) {
          const isWorkspace = !!selectedWorkspace;
          const sharingOptions = isWorkspace
            ? {
                credentials: {
                  user: workspaceCredentials?.credentials?.networkUser,
                  pass: workspaceCredentials?.credentials.networkPass,
                },
                mnemonic: selectedWorkspace?.workspaceUser.key,
              }
            : undefined;
          await dispatch(
            storageThunks.downloadFileThunk({
              file: item as DriveFileData,
              options: { taskId, sharingOptions: sharingOptions ?? item.sharingOptions },
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
    }

    if (errors.length > 0) {
      return rejectWithValue(errors);
    }
  },
);

type DownloadItemsAsZipThunkType = {
  items: DriveItemData[];
  folderIterator: FolderIterator | SharedFolderIterator;
  fileIterator: FileIterator | SharedFileIterator;
  credentials?: {
    user: string | undefined;
    pass: string | undefined;
  };
  mnemonic?: string;
  existingTaskId?: string;
  areSharedItems?: boolean;
  sharedFolderName?: string;
};

type FolderIterator = (directoryId: number, directoryUUID: string, workspaceId?: string) => Iterator<DriveFolderData>;
type FileIterator = (directoryId: number, directoryUUID: string, workspaceId?: string) => Iterator<DriveFileData>;

type SharedFolderIterator = (directoryId: string, resourcesToken) => Iterator<SharedFolders>;
type SharedFileIterator = (directoryId: string, resourcesToken) => Iterator<SharedFiles>;

export const downloadItemsAsZipThunk = createAsyncThunk<void, DownloadItemsAsZipThunkType, { state: RootState }>(
  'storage/downloadItemsAsZip',
  async (
    { items, credentials, mnemonic, existingTaskId, folderIterator, fileIterator, areSharedItems, sharedFolderName },
    { rejectWithValue, getState },
  ) => {
    const state = getState();
    const selectedWorkspace = workspacesSelectors.getSelectedWorkspace(state);
    const workspaceCredentials = workspacesSelectors.getWorkspaceCredentials(state);
    const errors: unknown[] = [];
    const lruFilesCacheManager = await LRUFilesCacheManager.getInstance();
    const downloadProgress: number[] = [];
    const abortController = new AbortController();
    const formattedDate = date.format(new Date(), 'DD/MM/YYYY - HH:mm');
    const folderName = sharedFolderName ?? `Internxt (${formattedDate})`;
    const folder = new FlatFolderZip(folderName, {});

    const workspaceCredentialsForOptions = workspaceCredentials?.credentials.networkUser
      ? {
          user: workspaceCredentials?.credentials.networkUser,
          pass: workspaceCredentials?.credentials.networkPass,
        }
      : undefined;
    const moreOptions = {
      credentials: workspaceCredentialsForOptions ?? credentials,
      mnemonic,
    };

    const user = localStorageService.getUser();
    if (!user) throw new Error('User not found');

    const taskId =
      existingTaskId ??
      tasksService.create<DownloadFilesTask>({
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

    for (const [index, driveItem] of items.entries()) {
      try {
        if (driveItem.isFolder) {
          const isSharedFolder = areSharedItems;
          if (isSharedFolder) {
            await folderService.downloadSharedFolderAsZip(
              driveItem.id,
              driveItem.name,
              folderIterator as SharedFolderIterator,
              fileIterator as SharedFileIterator,
              (progress) => {
                downloadProgress[index] = progress;
                updateProgressCallback(calculateProgress());
              },
              driveItem.uuid,
              { destination: folder, closeWhenFinished: false, ...moreOptions },
            );
          } else {
            await folderService.downloadFolderAsZip({
              folderId: driveItem.id,
              folderName: driveItem.name,
              folderUUID: driveItem.uuid,
              foldersIterator: folderIterator as FolderIterator,
              filesIterator: fileIterator as FileIterator,
              updateProgress: (progress) => {
                downloadProgress[index] = progress;
                updateProgressCallback(calculateProgress());
              },
              options: {
                destination: folder,
                closeWhenFinished: false,
                ...moreOptions,
                workspaceId: selectedWorkspace?.workspace.id,
              },
              abortController,
            });
          }
          downloadProgress[index] = 1;
        } else {
          let fileStream: ReadableStream<Uint8Array> | null = null;
          const cachedFile = await lruFilesCacheManager.get(driveItem.id.toString());
          const isCachedFileOlder = checkIfCachedSourceIsOlder({ cachedFile, file: driveItem });

          if (cachedFile?.source && !isCachedFileOlder) {
            const blob = cachedFile.source;
            downloadProgress[index] = 1;
            fileStream = blob.stream();
          } else {
            const downloadedFileStream = await downloadFile({
              fileId: driveItem.fileId,
              bucketId: driveItem.bucket,
              creds: {
                user: workspaceCredentials?.credentials.networkUser ?? credentials?.user ?? user.bridgeUser,
                pass: workspaceCredentials?.credentials.networkPass ?? credentials?.pass ?? user.userId,
              },
              mnemonic: selectedWorkspace?.workspaceUser.key ?? mnemonic ?? user.mnemonic,
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
      } catch (error) {
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
