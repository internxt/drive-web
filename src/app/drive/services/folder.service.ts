import { aes } from '@internxt/lib';
import { StorageTypes } from '@internxt/sdk/dist/drive';
import { FolderTree } from '@internxt/sdk/dist/drive/storage/types';
import { RequestCanceler } from '@internxt/sdk/dist/shared/http/types';
import { Iterator } from 'app/core/collections';
import { binaryStreamToBlob } from 'app/core/services/stream.service';
import { FlatFolderZip } from 'app/core/services/zip.service';
import { LRUFilesCacheManager } from 'app/database/services/database.service/LRUFilesCacheManager';
import { downloadFile } from 'app/network/download';
import { t } from 'i18next';
import { SdkFactory } from '../../core/factory/sdk';
import errorService from '../../core/services/error.service';
import httpService from '../../core/services/http.service';
import workspacesService from '../../core/services/workspace.service';
import { DriveFileData, DriveFolderData, DriveFolderMetadataPayload, DriveItemData } from '../types';
import { updateDatabaseFileSourceData } from './database.service';
import { addAllFilesToZip, addAllSharedFilesToZip } from './filesZip.service';
import { addAllFoldersToZip, addAllSharedFoldersToZip } from './foldersZip.service';
import newStorageService from './new-storage.service';
import {
  FileIterator,
  FolderIterator,
  SharedFileIterator,
  SharedFolderIterator,
} from '../../drive/services/downloadManager.service';
import { DriveItemBlobData } from '../../database/services/database.service';
import dateService from '../../core/services/date.service';
import { SharedFiles } from '@internxt/sdk/dist/drive/share/types';
import { queue, QueueObject } from 'async';
import { QueueUtilsService } from 'app/utils/queueUtils';
import { ConnectionLostError } from './../../network/requests';

export interface IFolders {
  bucket: string;
  color: string;
  createdAt: Date;
  encrypt_version: string;
  icon: string;
  iconId: number | null;
  icon_id: number | null;
  id: number;
  name: string;
  parentId: number;
  parent_id: number;
  updatedAt: Date;
  userId: number;
  user_id: number;
}

export interface FolderChild {
  bucket: string;
  color: string;
  createdAt: string;
  encrypt_version: string;
  icon: string;
  iconId: number | null;
  icon_id: number | null;
  id: number;
  name: string;
  parentId: number;
  parent_id: number;
  updatedAt: string;
  userId: number;
  user_id: number;
}

export interface FetchFolderContentResponse {
  bucket: string;
  children: FolderChild[];
  color: string;
  createdAt: string;
  encrypt_version: string;
  files: DriveItemData[];
  icon: string;
  id: number;
  name: string;
  parentId: number;
  parent_id: number;
  updatedAt: string;
  userId: number;
  user_id: number;
}

export interface DownloadFolderAsZipOptions {
  destination?: FlatFolderZip;
  closeWhenFinished?: boolean;
  credentials: {
    user: string;
    pass: string;
  };
  mnemonic: string;
  isPublicShare?: boolean;
  workspaceId?: string;
}

export function createFolder(
  currentFolderId: number,
  folderName: string,
): [Promise<StorageTypes.CreateFolderResponse>, RequestCanceler] {
  const payload: StorageTypes.CreateFolderPayload = {
    parentFolderId: currentFolderId,
    folderName: folderName,
  };
  const storageClient = SdkFactory.getInstance().createStorageClient();
  const [createdFolderPromise, requestCanceler] = storageClient.createFolder(payload);

  const finalPromise = createdFolderPromise
    .then((response) => {
      return response;
    })
    .catch((error) => {
      throw errorService.castError(error);
    });

  return [finalPromise, requestCanceler];
}

export function createFolderByUuid(
  parentFolderUuid: string,
  plainName: string,
): [Promise<StorageTypes.CreateFolderResponse>, RequestCanceler] {
  const payload: StorageTypes.CreateFolderByUuidPayload = {
    plainName: plainName,
    parentFolderUuid: parentFolderUuid,
  };
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  const [promise, requestCanceler] = storageClient.createFolderByUuid(payload);

  const finalPromise = promise
    .then((response) => {
      return response;
    })
    .catch((error) => {
      throw errorService.castError(error);
    });

  return [finalPromise, requestCanceler];
}

export async function updateMetaData(
  folderUuid: string,
  metadata: DriveFolderMetadataPayload,
  resourcesToken?: string,
): Promise<void> {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();

  const payload = {
    folderUuid,
    name: metadata.itemName,
  };

  return storageClient.updateFolderNameWithUUID(payload, resourcesToken);
}

export async function deleteFolder(folderData: DriveFolderData): Promise<void> {
  const trashClient = SdkFactory.getNewApiInstance().createTrashClient();
  await trashClient.deleteFolder(folderData.id);
}

export async function deleteBackupDeviceAsFolder(folderData: DriveFolderData): Promise<void> {
  const storageClient = SdkFactory.getInstance().createStorageClient();
  await storageClient.deleteFolder(folderData.id);
}

interface GetDirectoryFoldersResponse {
  folders: DriveFolderData[];
  last: boolean;
}

class DirectoryFolderIterator implements Iterator<DriveFolderData> {
  private offset: number;
  private limit: number;
  private readonly queryValues: { directoryId: number; workspaceId?: string; directoryUUID: string };

  constructor(
    queryValues: { directoryId: number; workspaceId?: string; directoryUUID: string },
    limit?: number,
    offset?: number,
  ) {
    this.limit = limit ?? 5;
    this.offset = offset ?? 0;
    this.queryValues = queryValues;
  }

  async next() {
    const { directoryId, workspaceId, directoryUUID } = this.queryValues;

    let folders;
    let last;
    if (workspaceId) {
      const [foldersPromise] = workspacesService.getWorkspaceFolders(
        workspaceId,
        directoryUUID,
        this.offset,
        this.limit,
      );
      folders = (await foldersPromise).result;
      const isLast = folders.length <= this.limit;
      last = isLast;
    } else {
      const { folders: storageFolders, last: storageLast } = await httpService.get<GetDirectoryFoldersResponse>(
        `/storage/v2/folders/${directoryId}/folders?limit=${this.limit}&offset=${this.offset}`,
      );
      folders = storageFolders;
      last = storageLast;
    }

    this.offset += this.limit;

    return { value: folders, done: last };
  }
}

interface GetDirectoryFilesResponse {
  files: DriveFileData[];
  last: boolean;
}

class DirectoryFilesIterator implements Iterator<DriveFileData> {
  private offset: number;
  private limit: number;
  private readonly queryValues: { directoryId: number; workspaceId?: string; directoryUUID: string };

  constructor(
    queryValues: { directoryId: number; workspaceId?: string; directoryUUID: string },
    limit?: number,
    offset?: number,
  ) {
    this.limit = limit ?? 5;
    this.offset = offset ?? 0;
    this.queryValues = queryValues;
  }

  async next() {
    const { directoryId, workspaceId, directoryUUID } = this.queryValues;

    let files;
    let last;
    if (workspaceId) {
      const [filesPromise] = workspacesService.getWorkspaceFiles(workspaceId, directoryUUID, this.offset, this.limit);
      files = (await filesPromise).result;

      const isLast = files.length <= this.limit;
      last = isLast;
    } else {
      const { files: storageFiles, last: storageLast } = await httpService.get<GetDirectoryFilesResponse>(
        `/storage/v2/folders/${directoryId}/files?limit=${this.limit}&offset=${this.offset}`,
      );
      files = storageFiles;
      last = storageLast;
    }

    this.offset += this.limit;

    return { value: files, done: last };
  }
}

export const createFoldersIterator = (
  directoryId: number,
  directoryUUID: string,
  workspaceId?: string,
): Iterator<DriveFolderData> => {
  return new DirectoryFolderIterator({ directoryId, workspaceId, directoryUUID }, 20, 0);
};

export const createFilesIterator = (
  directoryId: number,
  directoryUUID: string,
  workspaceId?: string,
): Iterator<DriveFileData> => {
  return new DirectoryFilesIterator({ directoryId, workspaceId, directoryUUID }, 20, 0);
};

interface FolderRef {
  name: string;
  folderId: number;
  folderUuid?: string;
  folderToken?: string;
  fileToken?: string;
}

export async function downloadFolderAsZip({
  folder,
  isSharedFolder,
  foldersIterator,
  filesIterator,
  updateProgress,
  updateNumItems,
  options,
  abortController,
}: {
  folder: DriveFolderData;
  isSharedFolder: boolean;
  foldersIterator: FolderIterator | SharedFolderIterator;
  filesIterator: FileIterator | SharedFileIterator;
  updateProgress: (progress: number) => void;
  updateNumItems: () => void;
  options: DownloadFolderAsZipOptions;
  abortController?: AbortController;
}): Promise<{
  totalItems: DriveFileData[] & SharedFiles[];
  failedItems: DriveFileData[] & SharedFiles[];
  allItemsFailed: boolean;
}> {
  const folderId: DriveFolderData['id'] = folder.id;
  const folderName: DriveFolderData['name'] = folder.plainName ?? folder.plain_name ?? folder.name;
  const folderUUID: DriveFolderData['uuid'] = folder.uuid;
  const rootFolder: FolderRef = { folderId, name: folderName, folderUuid: folderUUID };
  const failedItems: DriveFileData[] & SharedFiles[] = [];
  const totalItems: DriveFileData[] & SharedFiles[] = [];
  let allItemsFailed = false;

  const workspaceId = options.workspaceId;
  let totalSize = 0;
  let totalSizeIsReady = false;
  const zip =
    options.destination ??
    new FlatFolderZip(rootFolder.name, {
      progress: (loadedBytes: number) => {
        if (totalSizeIsReady) {
          updateProgress(loadedBytes / totalSize);
        }
      },
      abortController,
    });

  const maxConcurrency = 5;
  const downloadQueue: QueueObject<FolderRef> = queue<FolderRef>((folderToDownload, next: (err?: Error) => void) => {
    if (abortController?.signal.aborted) return next(new Error('Download aborted'));

    const newConcurrency = QueueUtilsService.instance.getConcurrencyUsingPerfomance(
      downloadQueue.concurrency,
      maxConcurrency,
    );
    if (downloadQueue.concurrency !== newConcurrency) {
      downloadQueue.concurrency = newConcurrency;
    }

    if (!isSharedFolder) {
      downloadFolder(folderToDownload)
        .then(() => {
          next();
        })
        .catch((e: Error) => {
          next(e);
        });
    } else {
      downloadSharedFolder(folderToDownload)
        .then(() => {
          next();
        })
        .catch((e: Error) => {
          next(e);
        });
    }
  }, maxConcurrency);

  const addUniqueItem = (item) => {
    const isItemAlreadyAdded = totalItems.some((i) => i.id === item.id);
    if (!isItemAlreadyAdded) {
      totalItems.push(item);
    }
  };

  const downloadFolder = async (folderToDownload: FolderRef) => {
    const files = await addAllFilesToZip(
      folderToDownload.name,
      async (file) => {
        addUniqueItem(file);
        // TODO: QA REMOVE
        if (file.name.includes('internxt_test_file') || file.plainName?.includes('internxt_test_file')) {
          failedItems.push(file as DriveFileData);
          return;
        }
        try {
          updateNumItems();
          const lruFilesCacheManager = await LRUFilesCacheManager.getInstance();
          const cachedFile = await lruFilesCacheManager.get(file.uuid?.toString());
          const isCachedFileOlder = checkIfCachedSourceIsOlder({ cachedFile, file });

          if (cachedFile?.source && !isCachedFileOlder) {
            return cachedFile.source.stream();
          }

          const downloadedFileStream = await downloadFile({
            bucketId: file.bucket,
            fileId: file.fileId,
            creds: options.credentials,
            mnemonic: options.mnemonic,
            options: {
              notifyProgress: () => {},
              abortController,
            },
          });

          const sourceBlob = await binaryStreamToBlob(downloadedFileStream, file.type || '');
          await updateDatabaseFileSourceData({
            folderId: file.folderId,
            sourceBlob,
            fileId: file.id,
            updatedAt: file.updatedAt,
          });

          return sourceBlob.stream();
        } catch (error: any) {
          const serverUnavailableError = error.message === 'Server unavailable';
          const isLostConnectionError = error instanceof ConnectionLostError || error.message === 'Network Error';
          if (serverUnavailableError || isLostConnectionError) {
            throw error;
          }
          failedItems.push(file);
          return;
        }
      },
      (filesIterator as FileIterator)(folderToDownload.folderId, folderToDownload.folderUuid as string, workspaceId),
      zip,
    );

    const folders = await addAllFoldersToZip(
      folderToDownload.name,
      (foldersIterator as FolderIterator)(
        folderToDownload.folderId,
        folderToDownload.folderUuid as string,
        workspaceId,
      ),
      zip,
      () => {
        updateNumItems();
      },
    );

    totalSize += files.reduce((a, f) => f?.size + a, 0);

    const pendingFolders: FolderRef[] = folders.map((f) => {
      return {
        name: folderToDownload.name + '/' + (f.plainName ?? f.name),
        folderId: f.id,
        folderUuid: f.uuid,
      };
    });
    downloadQueue.push(pendingFolders);
  };

  const downloadSharedFolder = async (folderToDownload: FolderRef) => {
    const { files, token: fileToken } = await addAllSharedFilesToZip(
      folderToDownload.name,
      async (file) => {
        addUniqueItem(file);
        // TODO: QA REMOVE
        if (file.name.includes('internxt_test_file') || file.plainName?.includes('internxt_test_file')) {
          failedItems.push(file);
          return;
        }
        try {
          const lruFilesCacheManager = await LRUFilesCacheManager.getInstance();
          const cachedFile = await lruFilesCacheManager.get(file.uuid?.toString());
          const isCachedFileOlder = checkIfCachedSourceIsOlder({ cachedFile, file });

          updateNumItems();

          if (cachedFile?.source && !isCachedFileOlder) {
            updateProgress(1);
            return cachedFile.source.stream();
          }

          const downloadedFileStream = await downloadFile({
            bucketId: file.bucket as string,
            // TODO: TO WORK UNTIL SDK TYPE CORRECT THE field fileiId -> fileId
            fileId: (file as any).fileId,
            creds: options.credentials,
            mnemonic: options.mnemonic,
          });

          const sourceBlob = await binaryStreamToBlob(downloadedFileStream);
          await updateDatabaseFileSourceData({
            folderId: file.folderId,
            sourceBlob,
            fileId: file.id,
            updatedAt: file.updatedAt,
          });

          return sourceBlob.stream();
        } catch (error: any) {
          const serverUnavailableError = error.message === 'Server unavailable';
          const isLostConnectionError = error instanceof ConnectionLostError || error.message === 'Network Error';
          if (serverUnavailableError || isLostConnectionError) {
            throw error;
          }
          failedItems.push(file);
          return;
        }
      },
      (filesIterator as SharedFileIterator)(
        folderToDownload.folderUuid as string,
        folderToDownload.folderToken ?? folderToDownload.fileToken,
      ),
      zip,
    );

    const { folders, token: folderToken } = await addAllSharedFoldersToZip(
      folderToDownload.name,
      (foldersIterator as SharedFolderIterator)(folderToDownload.folderUuid as string, folderToDownload.folderToken),
      zip,
      () => {
        updateNumItems();
      },
    );

    totalSize += files.reduce((a, f) => parseInt(f.size) + a, 0);

    const pendingFolders: FolderRef[] = folders.map((f) => {
      return {
        name: folderToDownload.name + '/' + (f.plainName ?? f.name),
        folderId: f.id,
        folderUuid: f.uuid,
        folderToken,
        fileToken,
      };
    });
    downloadQueue.push(pendingFolders);
  };

  try {
    await downloadQueue.pushAsync(rootFolder);
    while (downloadQueue.running() > 0 || downloadQueue.length() > 0) {
      await downloadQueue.drain();
    }
    allItemsFailed = failedItems.length === totalItems.length;

    totalSizeIsReady = true;
    if (options.closeWhenFinished === undefined || options.closeWhenFinished === true) {
      if (allItemsFailed) {
        zip.abort();
      }
      updateProgress(1);
      await zip.close();
    }
  } catch (err) {
    const castedError = errorService.castError(err);
    zip.abort();
    await zip.close();
    throw castedError;
  }

  return { totalItems, failedItems, allItemsFailed };
}

export const checkIfCachedSourceIsOlder = ({
  cachedFile,
  file,
}: {
  cachedFile: DriveItemBlobData | undefined;
  file: DriveFileData | SharedFiles;
}): boolean => {
  const isCachedFileOlder = !cachedFile?.updatedAt
    ? true
    : dateService.isDateOneBefore({
        dateOne: cachedFile?.updatedAt,
        dateTwo: file?.updatedAt,
      });

  return isCachedFileOlder;
};

// NEED TO REVIEW THIS FUNCTION BEFORE MERGE, FOR NOW IS NOT WORKING WITH WORKSPACES FILES
async function fetchFolderTree(folderUUID: string): Promise<{
  tree: FolderTree;
  folderDecryptedNames: Record<number, string>;
  fileDecryptedNames: Record<number, string>;
  size: number;
}> {
  // const { tree, size } = await httpService.get<{ tree: FolderTree; size: number }>(`/storage/tree/${folderId}`);
  const { tree } = await newStorageService.getFolderTree(folderUUID);
  const size = tree.size;
  const folderDecryptedNames: Record<number, string> = {};
  const fileDecryptedNames: Record<number, string> = {};

  // ! Decrypts folders and files names
  const pendingFolders = [tree];
  while (pendingFolders.length > 0) {
    const currentTree = pendingFolders[0];
    const { folders, files } = {
      folders: currentTree.children,
      files: currentTree.files,
    };

    folderDecryptedNames[currentTree.id] = currentTree.plainName;

    for (const file of files) {
      fileDecryptedNames[file.id] = aes.decrypt(file.name, `${process.env.REACT_APP_CRYPTO_SECRET2}-${file.folderId}`);
    }

    pendingFolders.shift();

    // * Adds current folder folders to pending
    pendingFolders.push(...folders);
  }

  return { tree, folderDecryptedNames, fileDecryptedNames, size };
}

export async function moveFolder(folderId: number, destination: number): Promise<StorageTypes.MoveFolderResponse> {
  const storageClient = SdkFactory.getInstance().createStorageClient();
  const payload: StorageTypes.MoveFolderPayload = {
    folderId: folderId,
    destinationFolderId: destination,
  };

  return storageClient
    .moveFolder(payload)
    .then((response) => {
      return response;
    })
    .catch((err) => {
      const castedError = errorService.castError(err);
      if (castedError.status) {
        castedError.message = t(`tasks.move-folder.errors.${castedError.status}`);
      }
      throw castedError;
    });
}

export async function moveFolderByUuid(
  folderUuid: string,
  destinationFolderUuid: string,
): Promise<StorageTypes.FolderMeta> {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  const payload: StorageTypes.MoveFolderUuidPayload = {
    folderUuid: folderUuid,
    destinationFolderUuid: destinationFolderUuid,
  };

  return storageClient.moveFolderByUuid(payload).catch((err) => {
    const castedError = errorService.castError(err);
    if (castedError.status) {
      castedError.message = t(`tasks.move-folder.errors.${castedError.status}`);
    }
    throw castedError;
  });
}

const folderService = {
  createFolder,
  createFolderByUuid,
  updateMetaData,
  moveFolder,
  moveFolderByUuid,
  fetchFolderTree,
  downloadFolderAsZip,
  addAllFoldersToZip,
  addAllFilesToZip,
};

export default folderService;
