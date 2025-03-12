import { queue, QueueObject } from 'async';
import { DriveFileData, DriveFolderData, DriveItemData } from 'app/drive/types';
import { QueueUtilsService } from 'app/utils/queueUtils';
import tasksService from 'app/tasks/services/tasks.service';
import {
  DownloadFilesTask,
  DownloadFileTask,
  DownloadFolderTask,
  TaskData,
  TaskEvent,
  TaskStatus,
  TaskType,
} from 'app/tasks/types';
import folderService, {
  checkIfCachedSourceIsOlder,
  createFilesIterator,
  createFoldersIterator,
} from 'app/drive/services/folder.service';
import { WorkspaceCredentialsDetails, WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { saveAs } from 'file-saver';
import { downloadFile, NetworkCredentials } from './download';
import { ConnectionLostError } from './requests';
import { t } from 'i18next';
import errorService from 'app/core/services/error.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { DriveItemBlobData } from 'app/database/services/database.service';
import { getDatabaseFileSourceData, updateDatabaseFileSourceData } from 'app/drive/services/database.service';
import downloadService from 'app/drive/services/download.service';
import date from 'app/core/services/date.service';
import { FlatFolderZip } from 'app/core/services/zip.service';
import { SharedFiles, SharedFolders } from '@internxt/sdk/dist/drive/share/types';
import { binaryStreamToBlob } from 'app/core/services/stream.service';
import { Iterator } from 'app/core/collections';
import localStorageService from 'app/core/services/local-storage.service';
import { LRUFilesCacheManager } from 'app/database/services/database.service/LRUFilesCacheManager';
import { AdvancedSharedItem } from 'app/share/types';

type DownloadCredentials = {
  credentials: NetworkCredentials;
  mnemonic: string;
  workspaceId?: string;
};

type DownloadItem = {
  payload: DownloadItemType[];
  taskId?: string;
  selectedWorkspace: WorkspaceData | null;
  workspaceCredentials: WorkspaceCredentialsDetails | null;
  downloadCredentials?: DownloadCredentials;
  downloadOptions?: {
    areSharedItems?: boolean;
    showErrors?: boolean;
  };
  createFoldersIterator?: FolderIterator | SharedFolderIterator;
  createFilesIterator?: FileIterator | SharedFileIterator;
};

type DownloadItemType = DriveItemData | AdvancedSharedItem;

export type DownloadTask = {
  items: DownloadItemType[];
  taskId: string;
  options: {
    downloadName: string;
    areSharedItems: boolean;
    showErrors: boolean;
  };
  credentials: DownloadCredentials;
  abortController?: AbortController;
  createFoldersIterator: FolderIterator | SharedFolderIterator;
  createFilesIterator: FileIterator | SharedFileIterator;
};

export type FolderIterator = (
  directoryId: number,
  directoryUUID: string,
  workspaceId?: string,
) => Iterator<DriveFolderData>;
export type FileIterator = (
  directoryId: number,
  directoryUUID: string,
  workspaceId?: string,
) => Iterator<DriveFileData>;

export type SharedFolderIterator = (directoryId: string, resourcesToken: string) => Iterator<SharedFolders>;
export type SharedFileIterator = (directoryId: string, resourcesToken: string) => Iterator<SharedFiles>;

const getDownloadCredentialsFromWorkspace = (
  selectedWorkspace: WorkspaceData | null,
  workspaceCredentials: WorkspaceCredentialsDetails | null,
): DownloadCredentials | undefined => {
  const isWorkspaceSelected = !!selectedWorkspace;
  const credentials =
    isWorkspaceSelected && workspaceCredentials
      ? {
          credentials: {
            user: workspaceCredentials.credentials.networkUser,
            pass: workspaceCredentials.credentials.networkPass,
          },
          workspaceId: selectedWorkspace.workspace.id,
          mnemonic: selectedWorkspace.workspaceUser.key,
        }
      : undefined;
  return credentials;
};

const generateTasksForItems = async (downloadItem: DownloadItem): Promise<DownloadTask | undefined> => {
  const itemsPayload = downloadItem.payload;
  if (itemsPayload.length === 0) return;

  const uploadFolderAbortController = new AbortController();
  const abort = async () => uploadFolderAbortController.abort('Download cancelled');

  const formattedDate = date.format(new Date(), 'YYYY-MM-DD_HHmmss');
  let downloadName = `Internxt (${formattedDate})`;
  if (itemsPayload.length === 1) {
    const item = itemsPayload[0];
    if (itemsPayload[0].isFolder) {
      downloadName = item.name;
    } else {
      downloadName = item.type ? `${item.name}.${item.type}` : item.name;
    }
  }

  let taskId = downloadItem.taskId;
  if (taskId) {
    tasksService.updateTask({
      taskId,
      merge: {
        status: TaskStatus.Decrypting,
        cancellable: true,
        stop: abort,
      },
    });
  } else if (itemsPayload.length > 1) {
    taskId = tasksService.create<DownloadFilesTask>({
      action: TaskType.DownloadFile,
      file: {
        name: downloadName,
        type: 'zip',
        items: downloadItem.payload as DriveItemData[],
      },
      showNotification: true,
      cancellable: true,
      stop: abort,
    });
  } else {
    const item = itemsPayload[0];
    if (item.isFolder) {
      taskId = tasksService.create<DownloadFolderTask>({
        action: TaskType.DownloadFolder,
        folder: item as DriveFolderData,
        compressionFormat: 'zip',
        showNotification: true,
        cancellable: true,
        stop: abort,
      });
    } else {
      taskId = tasksService.create<DownloadFileTask>({
        action: TaskType.DownloadFile,
        file: item as DriveFileData,
        showNotification: true,
        cancellable: true,
        stop: abort,
      });
    }
  }

  const user = localStorageService.getUser();
  if (!user) throw new Error('User not found');

  const userCredentials: DownloadCredentials = {
    credentials: {
      user: user.bridgeUser,
      pass: user.userId,
    },
    mnemonic: user.mnemonic,
  };
  const workspaceCredentials = getDownloadCredentialsFromWorkspace(
    downloadItem.selectedWorkspace,
    downloadItem.workspaceCredentials,
  );
  const credentials = downloadItem.downloadCredentials ?? workspaceCredentials ?? userCredentials;

  const options: DownloadTask['options'] = {
    downloadName,
    areSharedItems: !!downloadItem.downloadOptions?.areSharedItems,
    showErrors: true,
  };

  const filesIterator = downloadItem.createFilesIterator ?? createFilesIterator;
  const foldersIterator = downloadItem.createFoldersIterator ?? createFoldersIterator;

  return {
    items: itemsPayload,
    taskId,
    credentials,
    options,
    abortController: uploadFolderAbortController,
    createFilesIterator: filesIterator,
    createFoldersIterator: foldersIterator,
  };
};

export class DownloadManager {
  private static readonly MAX_CONCURRENT_DOWNLOADS = 6;

  private static readonly downloadQueue: QueueObject<DownloadTask> = queue<DownloadTask>(
    (downloadTask, next: (err?: Error) => void) => {
      if (downloadTask.abortController?.signal.aborted) return next(new Error('Download aborted'));

      const newConcurrency = QueueUtilsService.getConcurrencyUsingPerfomance(
        this.downloadQueue.concurrency,
        DownloadManager.MAX_CONCURRENT_DOWNLOADS,
      );
      if (this.downloadQueue.concurrency !== newConcurrency) {
        this.downloadQueue.concurrency = newConcurrency;
      }

      this.downloadTask(downloadTask)
        .then(() => {
          next();
        })
        .catch((e: Error) => {
          next(e);
        });
    },
    this.MAX_CONCURRENT_DOWNLOADS,
  );

  private static readonly downloadTask = async (downloadTask: DownloadTask) => {
    const { items, taskId, abortController } = downloadTask;

    const task = tasksService.findTask(taskId);
    if (task?.status === TaskStatus.Cancelled || abortController?.signal.aborted) {
      return;
    }

    const cancelTaskListener = (task?: TaskData) => {
      const isCurrentTask = task && task.id === taskId;
      if (isCurrentTask && task.status === TaskStatus.Cancelled) {
        abortController?.abort();
      }
    };
    tasksService.addListener({ event: TaskEvent.TaskCancelled, listener: cancelTaskListener });

    try {
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

      const incrementItemCount = () => {
        if (task?.status !== TaskStatus.Cancelled) {
          tasksService.updateTask({
            taskId,
            merge: {
              status: TaskStatus.InProcess,
              nItems: (task?.nItems ?? 0) + 1,
            },
          });
        }
      };

      tasksService.updateTask({
        taskId: taskId,
        merge: {
          status: TaskStatus.Decrypting,
        },
      });

      if (items.length > 1) {
        await this.downloadItems(downloadTask, updateProgressCallback, incrementItemCount);
      } else if (items[0].isFolder) {
        await this.downloadFolder(downloadTask, updateProgressCallback, incrementItemCount);
      } else {
        await this.downloadFile(downloadTask, updateProgressCallback);
      }

      tasksService.updateTask({
        taskId,
        merge: {
          status: TaskStatus.Success,
        },
      });
    } catch (err) {
      this.reportError(err, downloadTask);
    } finally {
      tasksService.removeListener({ event: TaskEvent.TaskCancelled, listener: cancelTaskListener });
    }
  };

  private static readonly downloadFolder = async (
    downloadTask: DownloadTask,
    updateProgressCallback: (progress: number) => void,
    incrementItemCount: () => void,
  ) => {
    const { items, taskId, credentials, abortController, createFilesIterator, createFoldersIterator, options } =
      downloadTask;
    const folder = items[0];

    tasksService.updateTask({
      taskId,
      merge: {
        status: TaskStatus.InProcess,
        progress: Infinity,
        nItems: 0,
      },
    });

    await this.downloadFolderItem({
      isSharedFolder: options.areSharedItems,
      driveItem: folder,
      closeWhenFinished: true,
      credentials,
      updateProgress: updateProgressCallback,
      incrementItemCount,
      createFoldersIterator,
      createFilesIterator,
      abortController,
    });
  };

  private static readonly downloadFile = async (
    downloadTask: DownloadTask,
    updateProgressCallback: (progress: number) => void,
  ) => {
    const { items, credentials, options, abortController } = downloadTask;
    const file = items[0] as DriveFileData;

    let cachedFile: DriveItemBlobData | undefined;
    let isCachedFileOlder = false;
    try {
      cachedFile = await getDatabaseFileSourceData({ fileId: file.id });
      isCachedFileOlder = checkIfCachedSourceIsOlder({ cachedFile, file });
    } catch (error) {
      errorService.addBreadcrumb({
        level: 'info',
        category: 'download-file',
        message: 'Failed to check if cached file is older',
        data: {
          fileId: file.id,
        },
      });
      errorService.reportError(error);
    }

    if (cachedFile?.source && !isCachedFileOlder) {
      updateProgressCallback(1);
      saveAs(cachedFile.source, options.downloadName);
    } else {
      const isWorkspace = !!credentials.workspaceId;
      await downloadService.downloadFile(file, isWorkspace, updateProgressCallback, abortController, credentials);
    }
  };

  private static readonly downloadItems = async (
    downloadTask: DownloadTask,
    updateProgressCallback: (progress: number) => void,
    incrementItemCount: () => void,
  ) => {
    const { items, credentials, abortController, options, createFilesIterator, createFoldersIterator } = downloadTask;

    const folderZip = new FlatFolderZip(options.downloadName, {});
    const downloadProgress: number[] = [];

    items.forEach((_, index) => {
      downloadProgress[index] = 0;
    });

    const calculateProgress = () => {
      const totalProgress = downloadProgress.reduce((previous, current) => {
        return previous + current;
      }, 0);

      return totalProgress / downloadProgress.length;
    };

    for (const [index, driveItem] of items.entries()) {
      if (abortController?.signal.aborted) return;
      try {
        if (driveItem.isFolder) {
          await this.downloadFolderItem({
            isSharedFolder: options.areSharedItems,
            driveItem,
            destination: folderZip,
            closeWhenFinished: false,
            credentials,
            updateProgress: (progress) => {
              downloadProgress[index] = progress;
              updateProgressCallback(calculateProgress());
            },
            incrementItemCount,
            createFoldersIterator,
            createFilesIterator,
            abortController,
          });
          downloadProgress[index] = 1;
        } else {
          let fileStream: ReadableStream<Uint8Array>;
          const lruFilesCacheManager = await LRUFilesCacheManager.getInstance();
          const cachedFile = await lruFilesCacheManager.get(driveItem.id.toString());
          const isCachedFileOlder = checkIfCachedSourceIsOlder({ cachedFile, file: driveItem });

          if (cachedFile?.source && !isCachedFileOlder) {
            const blob = cachedFile.source;
            downloadProgress[index] = 1;
            fileStream = blob.stream();
          } else {
            const downloadedFileStream = await downloadFile({
              fileId: (driveItem as DriveFileData).fileId,
              bucketId: (driveItem as DriveFileData).bucket,
              creds: {
                user: (driveItem as AdvancedSharedItem).credentials?.networkUser ?? credentials.credentials.user,
                pass: (driveItem as AdvancedSharedItem).credentials?.networkPass ?? credentials.credentials.pass,
              },
              mnemonic: (driveItem as AdvancedSharedItem).credentials?.mnemonic ?? credentials.mnemonic,
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

          folderZip.addFile(`${driveItem.name}${driveItem.type ? '.' + driveItem.type : ''}`, fileStream);
        }
      } catch (error) {
        abortController?.abort();
        throw error;
      }
    }

    await folderZip.close();
  };

  private static readonly downloadFolderItem = ({
    isSharedFolder,
    driveItem,
    destination,
    closeWhenFinished,
    credentials,
    updateProgress,
    incrementItemCount,
    createFoldersIterator,
    createFilesIterator,
    abortController,
  }: {
    isSharedFolder: boolean;
    driveItem: DownloadItemType;
    destination?: FlatFolderZip;
    closeWhenFinished: boolean;
    credentials: DownloadCredentials;
    updateProgress: (progress: number) => void;
    incrementItemCount: () => void;
    createFoldersIterator: FolderIterator | SharedFolderIterator;
    createFilesIterator: FileIterator | SharedFileIterator;
    abortController?: AbortController;
  }): Promise<void> => {
    if (isSharedFolder) {
      return folderService.downloadSharedFolderAsZip(
        driveItem.id,
        driveItem.name,
        createFoldersIterator as SharedFolderIterator,
        createFilesIterator as SharedFileIterator,
        updateProgress,
        incrementItemCount,
        driveItem.uuid,
        {
          destination,
          closeWhenFinished,
          credentials: {
            user: (driveItem as AdvancedSharedItem).credentials?.networkUser ?? credentials.credentials.user,
            pass: (driveItem as AdvancedSharedItem).credentials?.networkPass ?? credentials.credentials.pass,
          },
          mnemonic: (driveItem as AdvancedSharedItem).credentials?.mnemonic ?? credentials.mnemonic,
          workspaceId: credentials.workspaceId,
        },
        abortController,
      );
    } else {
      return folderService.downloadFolderAsZip({
        folderId: driveItem.id,
        folderName: driveItem.name,
        folderUUID: driveItem.uuid,
        foldersIterator: createFoldersIterator as FolderIterator,
        filesIterator: createFilesIterator as FileIterator,
        updateProgress,
        updateNumItems: incrementItemCount,
        options: {
          destination,
          closeWhenFinished,
          ...credentials,
        },
        abortController,
      });
    }
  };

  private static readonly reportError = (err: unknown, downloadTask: DownloadTask) => {
    const { items, taskId, abortController } = downloadTask;

    if (err instanceof ConnectionLostError) {
      return tasksService.updateTask({
        taskId,
        merge: { status: TaskStatus.Error, subtitle: t('error.connectionLostError') as string },
      });
    }

    if (abortController?.signal.aborted) {
      return tasksService.updateTask({
        taskId,
        merge: {
          status: TaskStatus.Cancelled,
        },
      });
    }

    if (items.length > 1) {
      errorService.reportError(err);
    } else {
      const item = items[0];
      if (item.isFolder) {
        errorService.reportError(err, {
          extra: { folder: item.name, bucket: item.bucket, folderParentId: item.parentId },
        });
      } else {
        errorService.reportError(err, {
          extra: { fileName: item.name, bucket: item.bucket, fileSize: item.size, fileType: item.type },
        });
      }
    }

    const task = tasksService.findTask(taskId);

    if (task?.status !== TaskStatus.Cancelled) {
      tasksService.updateTask({
        taskId,
        merge: {
          status: TaskStatus.Error,
        },
      });

      const castedError = errorService.castError(err);

      if (downloadTask.options.showErrors) {
        const errorText = items.length > 1 || !items[0].isFolder ? 'error.downloadingFile' : 'error.downloadingFolder';

        notificationsService.show({
          text: t(errorText, { message: castedError.message || '' }),
          type: ToastType.Error,
        });
      }
      throw castedError;
    }
  };

  public static readonly add = async (downloadItem: DownloadItem) => {
    const newTask = await generateTasksForItems(downloadItem);

    if (newTask) {
      this.downloadQueue.push(newTask);
    }
  };
}
