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
import errorService from 'app/core/services/error.service';
import { FlatFolderZip } from 'app/core/services/zip.service';
import downloadService from './download.service';
import { LRUFilesCacheManager } from 'app/database/services/database.service/LRUFilesCacheManager';
import { AdvancedSharedItem } from 'app/share/types';
import { binaryStreamToBlob } from 'app/core/services/stream.service';
import { downloadFile, NetworkCredentials } from 'app/network/download';
import localStorageService from 'app/core/services/local-storage.service';
import date from 'app/core/services/date.service';
import { Iterator } from 'app/core/collections';
import { SharedFiles, SharedFolders } from '@internxt/sdk/dist/drive/share/types';
import { WorkspaceCredentialsDetails, WorkspaceData } from '@internxt/sdk/dist/workspaces';

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

export type SharedFolderIterator = (directoryId: string, resourcesToken?: string) => Iterator<SharedFolders>;
export type SharedFileIterator = (directoryId: string, resourcesToken?: string) => Iterator<SharedFiles>;

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
    };
  };

  readonly downloadFolder = async (
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

    await downloadFolderAsZip({
      folder: folder as DriveFolderData,
      isSharedFolder: options.areSharedItems,
      foldersIterator: createFoldersIterator,
      filesIterator: createFilesIterator,
      updateProgress: updateProgressCallback,
      updateNumItems: incrementItemCount,
      options: {
        closeWhenFinished: true,
        ...credentials,
      },
      abortController,
    });
  };

  readonly downloadFile = async (downloadTask: DownloadTask, updateProgressCallback: (progress: number) => void) => {
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

  readonly downloadItems = async (
    downloadTask: DownloadTask,
    updateProgressCallback: (progress: number) => void,
    incrementItemCount: () => void,
  ) => {
    const { items, credentials, abortController, options, createFilesIterator, createFoldersIterator } = downloadTask;

    const folderZip = new FlatFolderZip(options.downloadName, { abortController });
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

    const addFileStreamToZip = async (index: number, driveItem: DownloadItemType) => {
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
    };

    const addFolderToZip = async (index: number, driveItem: DownloadItemType) => {
      await downloadFolderAsZip({
        folder: driveItem as DriveFolderData,
        isSharedFolder: options.areSharedItems,
        foldersIterator: createFoldersIterator,
        filesIterator: createFilesIterator,
        updateProgress: (progress) => {
          downloadProgress[index] = progress;
          updateProgressCallback(calculateProgress());
        },
        updateNumItems: incrementItemCount,
        options: {
          destination: folderZip,
          closeWhenFinished: false,
          ...credentials,
        },
        abortController,
      });
      downloadProgress[index] = 1;
    };

    for (const [index, driveItem] of items.entries()) {
      if (abortController?.signal.aborted) {
        await folderZip.close();
        return;
      }

      try {
        if (driveItem.isFolder) {
          await addFolderToZip(index, driveItem);
        } else {
          await addFileStreamToZip(index, driveItem);
        }
      } catch (error) {
        folderZip.abort();
        throw error;
      }
    }

    await folderZip.close();
  };
}
