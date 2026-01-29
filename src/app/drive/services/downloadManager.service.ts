import tasksService from 'app/tasks/services/tasks.service';
import { DownloadFilesTask, DownloadFileTask, DownloadFolderTask, TaskStatus, TaskType } from 'app/tasks/types';
import { DriveFileData, DriveFolderData, DriveItemData } from '../types';
import { saveAs } from 'file-saver';
import { DriveItemBlobData } from 'app/database/services/database.service';
import { getDatabaseFileSourceData, updateDatabaseFileSourceData } from './database.service';
import {
  checkIfCachedSourceIsOlder,
  createFilesIterator,
  createFoldersIterator,
  downloadFolderAsZip,
} from './folder.service';
import errorService from 'services/error.service';
import { FlatFolderZip } from 'services/zip.service';
import { LRUFilesCacheManager } from 'app/database/services/database.service/LRUFilesCacheManager';
import { AdvancedSharedItem } from 'app/share/types';
import { binaryStreamToBlob } from 'services/stream.service';
import { downloadFile, NetworkCredentials } from 'app/network/download';
import localStorageService from 'services/local-storage.service';
import date from 'services/date.service';
import { WorkspaceCredentialsDetails, WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { ConnectionLostError } from 'app/network/requests';
import { ErrorMessages } from 'app/core/constants';
import {
  FolderIterator,
  FileIterator,
  SharedFolderIterator,
  SharedFileIterator,
  isLostConnectionError as isLostConnectionErrorUtil,
} from '../types/download-types';
import { downloadWorkerHandler } from './worker.service/downloadWorkerHandler';
import { isFileEmpty } from 'utils/isFileEmpty';
import deviceService from 'services/device.service';

export type DownloadCredentials = {
  credentials: NetworkCredentials;
  mnemonic: string;
  workspaceId?: string;
};

export type DownloadItem = {
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

export type DownloadItemType = DriveItemData | AdvancedSharedItem;

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
  failedItems: DownloadItemType[];
};

/**
 * DownloadManagerService handles file and folder downloads with queue management
 *
 * @class DownloadManagerService
 * @static
 *
 * @property {DownloadManagerService} instance - Singleton instance of the service
 *
 * @method getDownloadCredentialsFromWorkspace - Extracts download credentials from workspace data
 * @method generateTasksForItem - Creates download tasks using download items
 * @method downloadFile - Handles file download process
 * @method downloadFolder - Handles folder download process (as zip)
 *
 * The service:
 * - Manages file and folder downloads
 * - Integrates with task service for progress tracking
 * - Supports workspace-specific downloads
 * - Handles shared items downloads
 * - Provides error handling and notifications
 */
export class DownloadManagerService {
  public static readonly instance: DownloadManagerService = new DownloadManagerService();

  readonly getDownloadCredentialsFromWorkspace = (
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

  readonly generateTasksForItem = async (downloadItem: DownloadItem): Promise<DownloadTask | undefined> => {
    const itemsPayload = downloadItem.payload;
    if (itemsPayload.length === 0) return;

    const uploadFolderAbortController = new AbortController();
    const abort = () => Promise.resolve(uploadFolderAbortController.abort('Download cancelled'));

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
    const workspaceCredentials = this.getDownloadCredentialsFromWorkspace(
      downloadItem.selectedWorkspace,
      downloadItem.workspaceCredentials,
    );
    // First try to use the credentials from the download item, then from the workspace if it is selected, and lastly from the user
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
      failedItems: [],
    };
  };

  readonly downloadFolder = async (
    downloadTask: DownloadTask,
    updateProgressCallback: (progress: number) => void,
    updateDownloadedProgress: (progress: number) => void,
    incrementItemCount: () => void,
  ) => {
    const { connectionLost, cleanup } = this.handleConnectionLost(5000);
    const { items, taskId, credentials, abortController, createFilesIterator, createFoldersIterator, options } =
      downloadTask;
    const folder = items[0];

    tasksService.updateTask({
      taskId,
      merge: {
        status: TaskStatus.InProcess,
        progress: Infinity,
      },
    });

    try {
      const zipFolderResult = await downloadFolderAsZip({
        folder: folder as DriveFolderData,
        isSharedFolder: options.areSharedItems,
        foldersIterator: createFoldersIterator,
        filesIterator: createFilesIterator,
        updateProgress: updateProgressCallback,
        downloadProgress: updateDownloadedProgress,
        updateNumItems: incrementItemCount,
        options: {
          closeWhenFinished: true,
          ...credentials,
        },
        abortController,
      });

      await this.checkAndHandleConnectionLost(connectionLost);

      if (zipFolderResult?.allItemsFailed) {
        throw new Error(ErrorMessages.ServerUnavailable);
      } else if (zipFolderResult?.failedItems.length > 0) {
        downloadTask.failedItems.push(...(zipFolderResult.failedItems as DownloadItemType[]));
      }
    } catch (error) {
      await this.checkAndHandleConnectionLost(connectionLost);
      throw error;
    } finally {
      cleanup();
    }
  };

  readonly downloadFile = async (downloadTask: DownloadTask, updateProgressCallback: (progress: number) => void) => {
    const { connectionLost, cleanup } = this.handleConnectionLost(5000);

    try {
      const { items, credentials, options, abortController } = downloadTask;
      const file = items[0] as DriveFileData;

      if (isFileEmpty(file)) {
        saveAs(new Blob([]), options.downloadName);
        return;
      }

      let cachedFile: DriveItemBlobData | undefined;
      let isCachedFileOlder = false;
      try {
        cachedFile = await getDatabaseFileSourceData({ fileId: file.id });
        isCachedFileOlder = checkIfCachedSourceIsOlder({ cachedFile, file });
      } catch (error) {
        errorService.reportError(error);
      }

      if (cachedFile?.source && !isCachedFileOlder) {
        updateProgressCallback(1);
        saveAs(cachedFile.source, options.downloadName);
      } else {
        const isWorkspace = !!credentials.workspaceId;

        console.time(`download-file-${file.uuid}`);

        await this.downloadFileFromWorker({
          file,
          isWorkspace,
          updateProgressCallback,
          abortController,
          sharingOptions: credentials,
        });

        console.timeEnd(`download-file-${file.uuid}`);
      }

      await this.checkAndHandleConnectionLost(connectionLost);
    } catch (error) {
      await this.checkAndHandleConnectionLost(connectionLost);
      throw error;
    } finally {
      cleanup();
    }
  };

  readonly downloadItems = async (
    downloadTask: DownloadTask,
    updateProgressCallback: (progress: number) => void,
    updateDownloadedProgress: (progress: number) => void,
    incrementItemCount: () => void,
  ) => {
    const { connectionLost, cleanup } = this.handleConnectionLost(5000);
    try {
      const { items, credentials, abortController, options, createFilesIterator, createFoldersIterator } = downloadTask;

      const folderZip = new FlatFolderZip(options.downloadName, { abortController });
      const downloadProgress: number[] = [];
      const lastReportedBytes: number[] = [];
      const failedItems: DownloadItemType[] = [];
      let downloadedProgress = 0;

      items.forEach((_, index) => {
        downloadProgress[index] = 0;
        lastReportedBytes[index] = 0;
      });

      const calculateProgress = () => {
        const totalProgress = downloadProgress.reduce((previous, current) => {
          return previous + current;
        }, 0);

        return totalProgress / downloadProgress.length;
      };

      const addFileStreamToZip = async (index: number, driveItem: DownloadItemType) => {
        const lruFilesCacheManager = await LRUFilesCacheManager.getInstance();
        let fileStream: ReadableStream<Uint8Array>;
        const cachedFile = await lruFilesCacheManager.get(driveItem.id.toString());
        const isCachedFileOlder = checkIfCachedSourceIsOlder({ cachedFile, file: driveItem });

        if (cachedFile?.source && !isCachedFileOlder) {
          const blob = cachedFile.source;
          downloadProgress[index] = 1;
          fileStream = blob.stream();
          folderZip.addFile(`${driveItem.name}${driveItem.type ? '.' + driveItem.type : ''}`, fileStream);
          return;
        }

        if (isFileEmpty(driveItem as DriveFileData)) {
          const emptyBlob = new Blob([]);
          downloadProgress[index] = 1;
          fileStream = emptyBlob.stream();
          folderZip.addFile(`${driveItem.name}${driveItem.type ? '.' + driveItem.type : ''}`, fileStream);
          return;
        }

        const notifyProgressCallback = (totalBytes: number, downloadedBytes: number) => {
          const progress = downloadedBytes / totalBytes;
          downloadProgress[index] = progress;

          const bytesDelta = downloadedBytes - lastReportedBytes[index];
          downloadedProgress += bytesDelta;
          lastReportedBytes[index] = downloadedBytes;

          updateDownloadedProgress(bytesDelta);
          updateProgressCallback(calculateProgress());
        };

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
            notifyProgress: notifyProgressCallback,
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
        folderZip.addFile(`${driveItem.name}${driveItem.type ? '.' + driveItem.type : ''}`, fileStream);
      };

      const addFolderToZip = async (index: number, driveItem: DownloadItemType) => {
        const downloadedItems = await downloadFolderAsZip({
          folder: driveItem as DriveFolderData,
          isSharedFolder: options.areSharedItems,
          foldersIterator: createFoldersIterator,
          filesIterator: createFilesIterator,
          updateProgress: (progress) => {
            downloadProgress[index] = progress;
            updateProgressCallback(calculateProgress());
          },
          downloadProgress: updateDownloadedProgress,
          updateNumItems: incrementItemCount,
          options: {
            destination: folderZip,
            closeWhenFinished: false,
            credentials: {
              user: (driveItem as AdvancedSharedItem).credentials?.networkUser ?? credentials.credentials.user,
              pass: (driveItem as AdvancedSharedItem).credentials?.networkPass ?? credentials.credentials.pass,
            },
            mnemonic: (driveItem as AdvancedSharedItem).credentials?.mnemonic ?? credentials.mnemonic,
            workspaceId: credentials.workspaceId,
          },
          abortController,
        });
        downloadProgress[index] = 1;

        await this.checkAndHandleConnectionLost(connectionLost, folderZip);

        if (downloadedItems.allItemsFailed) {
          failedItems.push(driveItem);
          return;
        }
        if (downloadedItems?.failedItems.length > 0) {
          failedItems.push(...(downloadedItems?.failedItems as DownloadItemType[]));
        }
      };

      for (const [index, driveItem] of items.entries()) {
        if (abortController?.signal.aborted) {
          await folderZip.close();
          return;
        }

        try {
          if (driveItem.isFolder) {
            await addFolderToZip(index, driveItem);
            continue;
          }
          await addFileStreamToZip(index, driveItem);
        } catch (error: unknown) {
          await this.checkAndHandleConnectionLost(connectionLost, folderZip);
          if (isLostConnectionError(error)) {
            folderZip.abort();
            await folderZip.close();
            throw error;
          }
          failedItems.push(driveItem);
        }
      }

      if (failedItems.length > 0 && areItemArraysEqual(items, failedItems)) {
        folderZip.abort();
        await folderZip.close();
        throw new Error(ErrorMessages.ServerUnavailable);
      }

      downloadTask.failedItems = failedItems;

      await folderZip.close();
    } catch (error) {
      await this.checkAndHandleConnectionLost(connectionLost);
      throw error;
    } finally {
      cleanup();
    }
  };

  readonly checkAndHandleConnectionLost = async (conn: boolean, zip?: FlatFolderZip) => {
    if (conn || navigator.onLine === false) {
      if (zip) {
        zip.abort();
        await zip.close();
      }
      throw new ConnectionLostError();
    }
  };

  readonly handleConnectionLost = (timeoutMs: number): { connectionLost: boolean; cleanup: () => void } => {
    let connectionLost = !navigator.onLine;

    const checkConnection = () => {
      connectionLost = !navigator.onLine;
      if (connectionLost) {
        console.warn('Connection lost detected.');
      }
    };

    const connectionLostListener = () => {
      connectionLost = true;
      console.warn('Offline event detected');
      window.removeEventListener('offline', connectionLostListener);
    };

    window.addEventListener('offline', connectionLostListener);

    const timeoutId = setTimeout(checkConnection, timeoutMs);

    const cleanup = () => {
      clearTimeout(timeoutId);
      window.removeEventListener('offline', connectionLostListener);
    };

    return { connectionLost, cleanup };
  };

  readonly downloadFileFromWorker = async (payload: {
    file: DriveFileData;
    isWorkspace: boolean;
    updateProgressCallback: (progress: number) => void;
    abortController?: AbortController;
    sharingOptions: { credentials: { user: string; pass: string }; mnemonic: string };
  }) => {
    const shouldDownloadUsingBlob =
      !!(navigator.brave && (await navigator.brave.isBrave())) ||
      (deviceService.isSafari() && payload.file.type === null);

    const worker: Worker = downloadWorkerHandler.getWorker();

    const workerPayload = {
      file: payload.file,
      isWorkspace: payload.isWorkspace,
      credentials: payload.sharingOptions,
      shouldDownloadUsingBlob,
    };

    worker.postMessage({ type: 'download', params: workerPayload });

    console.log('[DOWNLOAD-MANAGER] Start Downloading file -->', payload.file);

    return downloadWorkerHandler.handleWorkerMessages({
      worker,
      itemData: payload.file,
      updateProgressCallback: payload.updateProgressCallback,
      abortController: payload.abortController,
    });
  };
}

export const isLostConnectionError = isLostConnectionErrorUtil;

export const areItemArraysEqual = (firstArray: DownloadItemType[], secondArray: DownloadItemType[]) => {
  if (firstArray.length !== secondArray.length) return false;

  return firstArray.every((itemInFirstArray) =>
    secondArray.some(
      (itemInSecondArray) =>
        itemInSecondArray.id === itemInFirstArray.id &&
        Boolean(itemInSecondArray?.isFolder) === Boolean(itemInFirstArray?.isFolder),
    ),
  );
};
