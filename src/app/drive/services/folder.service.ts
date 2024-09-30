import { aes } from '@internxt/lib';
import { StorageTypes } from '@internxt/sdk/dist/drive';
import { SharedFiles, SharedFolders } from '@internxt/sdk/dist/drive/share/types';
import { FolderTree } from '@internxt/sdk/dist/drive/storage/types';
import { RequestCanceler } from '@internxt/sdk/dist/shared/http/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Iterator } from 'app/core/collections';
import { binaryStreamToBlob } from 'app/core/services/stream.service';
import { FlatFolderZip } from 'app/core/services/zip.service';
import { LRUFilesCacheManager } from 'app/database/services/database.service/LRUFilesCacheManager';
import { downloadFile } from 'app/network/download';
import { checkIfCachedSourceIsOlder } from 'app/store/slices/storage/storage.thunks/downloadFileThunk';
import { t } from 'i18next';
import { TrackingPlan } from '../../analytics/TrackingPlan';
import analyticsService from '../../analytics/services/analytics.service';
import { SdkFactory } from '../../core/factory/sdk';
import errorService from '../../core/services/error.service';
import httpService from '../../core/services/http.service';
import localStorageService from '../../core/services/local-storage.service';
import workspacesService from '../../core/services/workspace.service';
import { DevicePlatform } from '../../core/types';
import { DriveFileData, DriveFolderData, DriveFolderMetadataPayload, DriveItemData } from '../types';
import { updateDatabaseFileSourceData } from './database.service';
import { addAllFilesToZip, addAllSharedFilesToZip } from './filesZip.service';
import { addAllFoldersToZip, addAllSharedFoldersToZip } from './foldersZip.service';
import newStorageService from './new-storage.service';

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
  credentials?: {
    user: string | undefined;
    pass: string | undefined;
  };
  mnemonic?: string;
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
      const user = localStorageService.getUser() as UserSettings;
      analyticsService.trackFolderCreated({
        email: user.email,
        platform: DevicePlatform.Web,
      });
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
      const user = localStorageService.getUser() as UserSettings;
      analyticsService.trackFolderCreated({
        email: user.email,
        platform: DevicePlatform.Web,
      });
      return response;
    })
    .catch((error) => {
      throw errorService.castError(error);
    });

  return [finalPromise, requestCanceler];
}

export async function updateMetaData(folderUuid: string, metadata: DriveFolderMetadataPayload): Promise<void> {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();

  const payload = {
    folderUuid,
    name: metadata.itemName,
  };

  return storageClient.updateFolderNameWithUUID(payload).then(() => {
    const user: UserSettings = localStorageService.getUser() as UserSettings;
    analyticsService.trackFolderRename({
      email: user.email,
      fileId: folderUuid,
      platform: DevicePlatform.Web,
    });
  });
}

export function deleteFolder(folderData: DriveFolderData): Promise<void> {
  const trashClient = SdkFactory.getNewApiInstance().createTrashClient();
  return trashClient.deleteFolder(folderData.id).then(() => {
    const user = localStorageService.getUser() as UserSettings;
    analyticsService.trackDeleteItem(folderData as DriveItemData, {
      email: user.email,
      platform: DevicePlatform.Web,
    });
  });
}

export function deleteBackupDeviceAsFolder(folderData: DriveFolderData): Promise<void> {
  const storageClient = SdkFactory.getInstance().createStorageClient();
  return storageClient.deleteFolder(folderData.id).then(() => {
    const user = localStorageService.getUser() as UserSettings;
    analyticsService.trackDeleteItem(folderData as DriveItemData, {
      email: user.email,
      platform: DevicePlatform.Web,
    });
  });
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
}

async function downloadSharedFolderAsZip(
  folderId: DriveFolderData['id'],
  folderName: DriveFolderData['name'],
  foldersIterator: (directoryId: any, token: string) => Iterator<SharedFolders>,
  filesIterator: (directoryId: any, token: string) => Iterator<SharedFiles>,
  updateProgress: (progress: number) => void,
  folderUuid?: string,
  options?: DownloadFolderAsZipOptions,
): Promise<void> {
  const rootFolder: FolderRef = { folderId: folderId, name: folderName, folderUuid: folderUuid };
  const pendingFolders: FolderRef[] = [rootFolder];
  let totalSize = 0;
  let totalSizeIsReady = false;
  const zip =
    options?.destination ||
    new FlatFolderZip(rootFolder.name, {
      progress: (loadedBytes: number) => {
        if (totalSizeIsReady) {
          updateProgress(loadedBytes / totalSize);
        }
      },
    });

  const user = localStorageService.getUser();

  if (!user && !options?.isPublicShare) {
    throw new Error('user null');
  }

  const analyticsProcessIdentifier = analyticsService.getTrackingActionId();
  let trackingDownloadProperties: TrackingPlan.DownloadProperties = {
    process_identifier: analyticsProcessIdentifier,
    is_multiple: 1,
    bandwidth: 0,
    band_utilization: 0,
    file_size: 0,
    file_extension: '',
    file_id: 0,
    file_name: '',
    parent_folder_id: 0,
  };
  try {
    // Necessary tokens to obtain files and folders if the user is not the owner
    let nextFilesToken;
    let nextFolderToken;
    do {
      const folderToDownload = pendingFolders.shift() as FolderRef;

      const { files, token } = await addAllSharedFilesToZip(
        folderToDownload.name,
        async (file) => {
          const lruFilesCacheManager = await LRUFilesCacheManager.getInstance();
          const cachedFile = await lruFilesCacheManager.get(file.uuid?.toString());
          const isCachedFileOlder = checkIfCachedSourceIsOlder({ cachedFile, file });

          if (cachedFile?.source && !isCachedFileOlder) {
            updateProgress(1);
            return cachedFile.source.stream();
          }

          trackingDownloadProperties = {
            process_identifier: analyticsProcessIdentifier,
            file_id: typeof file.id === 'string' ? parseInt(file.id) : file.id,
            file_size: parseInt(file.size),
            file_extension: file.type,
            file_name: file.name,
            parent_folder_id: file.folderId,
            is_multiple: 1,
            bandwidth: 0,
            band_utilization: 0,
          };
          analyticsService.trackFileDownloadStarted(trackingDownloadProperties);

          const creds = options?.credentials
            ? (options.credentials as Record<'user' | 'pass', string>)
            : { user: user?.bridgeUser || '', pass: user?.userId || '' };

          const mnemonic = options?.mnemonic ? options?.mnemonic : user?.mnemonic || '';

          const downloadedFileStream = await downloadFile({
            bucketId: file.bucket as string,
            // TODO: TO WORK UNTIL SDK TYPE CORRECT THE field fileiId -> fileId
            fileId: (file as any).fileId,
            creds: creds,
            mnemonic: mnemonic,
          });
          analyticsService.trackFileDownloadCompleted(trackingDownloadProperties);

          const sourceBlob = await binaryStreamToBlob(downloadedFileStream);
          await updateDatabaseFileSourceData({
            folderId: file.folderId,
            sourceBlob,
            fileId: file.id,
            updatedAt: file.updatedAt,
          });

          return sourceBlob.stream();
        },
        filesIterator(folderToDownload.folderUuid as string, folderToDownload.folderToken ?? nextFilesToken),
        zip,
      );
      nextFilesToken = token;
      totalSize += files.reduce((a, f) => parseInt(f.size) + a, 0);

      const { folders, token: folderToken } = await addAllSharedFoldersToZip(
        folderToDownload.name,
        foldersIterator(folderToDownload.folderUuid as string, folderToDownload.folderToken ?? nextFolderToken),
        zip,
      );

      nextFolderToken = folderToken;
      pendingFolders.push(
        ...folders.map((f) => {
          return {
            name: folderToDownload.name + '/' + f.name,
            folderId: f.id,
            folderUuid: f.uuid,
            folderToken,
          };
        }),
      );
    } while (pendingFolders.length > 0);

    totalSizeIsReady = true;
    if (options?.closeWhenFinished === undefined || options.closeWhenFinished === true) {
      await zip.close();
    }
  } catch (err) {
    const castedError = errorService.castError(err);
    analyticsService.trackFileDownloadError({
      ...trackingDownloadProperties,
      error_message_user: 'Error downloading folder',
      error_message: castedError.message,
      stack_trace: castedError.stack ?? '',
    });
    console.error('ERROR WHILE DOWNLOADING FOLDER', castedError);
    zip.abort();
    throw castedError;
  }
}

async function downloadFolderAsZip({
  folderId,
  folderName,
  folderUUID,
  foldersIterator,
  filesIterator,
  updateProgress,
  options,
  abortController,
}: {
  folderId: DriveFolderData['id'];
  folderName: DriveFolderData['name'];
  folderUUID: DriveFolderData['uuid'];
  foldersIterator: (directoryId: number, directoryUUID: string, workspaceId?: string) => Iterator<DriveFolderData>;
  filesIterator: (directoryId: number, directoryUUID: string, workspaceId?: string) => Iterator<DriveFileData>;
  updateProgress: (progress: number) => void;
  options?: DownloadFolderAsZipOptions;
  abortController?: AbortController;
}): Promise<void> {
  const rootFolder: FolderRef = { folderId, name: folderName, folderUuid: folderUUID };
  const pendingFolders: FolderRef[] = [rootFolder];
  let totalSize = 0;
  const zip = options?.destination || new FlatFolderZip(folderName, {});
  const workspaceId = options?.workspaceId;
  const user = localStorageService.getUser();

  if (!user) {
    throw new Error('user null');
  }

  const analyticsProcessIdentifier = analyticsService.getTrackingActionId();
  let trackingDownloadProperties: TrackingPlan.DownloadProperties = {
    process_identifier: analyticsProcessIdentifier,
    is_multiple: 1,
    bandwidth: 0,
    band_utilization: 0,
    file_size: 0,
    file_extension: '',
    file_id: 0,
    file_name: '',
    parent_folder_id: 0,
  };
  try {
    do {
      const folderToDownload = pendingFolders.shift() as FolderRef;

      const files = await addAllFilesToZip(
        folderToDownload.name,
        async (file) => {
          const lruFilesCacheManager = await LRUFilesCacheManager.getInstance();
          const cachedFile = await lruFilesCacheManager.get(file.uuid?.toString());
          const isCachedFileOlder = checkIfCachedSourceIsOlder({ cachedFile, file });

          if (cachedFile?.source && !isCachedFileOlder) {
            return cachedFile.source.stream();
          }

          trackingDownloadProperties = {
            process_identifier: analyticsProcessIdentifier,
            file_id: typeof file.id === 'string' ? parseInt(file.id) : file.id,
            file_size: file.size,
            file_extension: file.type,
            file_name: file.name,
            parent_folder_id: file.folderId,
            is_multiple: 1,
            bandwidth: 0,
            band_utilization: 0,
          };
          analyticsService.trackFileDownloadStarted(trackingDownloadProperties);

          const creds = options?.credentials
            ? (options.credentials as Record<'user' | 'pass', string>)
            : { user: user.bridgeUser, pass: user.userId };

          const mnemonic = options?.mnemonic ? options?.mnemonic : user.mnemonic;
          const downloadedFileStream = await downloadFile({
            bucketId: file.bucket,
            fileId: file.fileId,
            creds: creds,
            mnemonic: mnemonic,
            options: {
              notifyProgress: () => {},
              abortController,
            },
          });
          analyticsService.trackFileDownloadCompleted(trackingDownloadProperties);

          const sourceBlob = await binaryStreamToBlob(downloadedFileStream, file.type || '');
          await updateDatabaseFileSourceData({
            folderId: file.folderId,
            sourceBlob,
            fileId: file.id,
            updatedAt: file.updatedAt,
          });

          return sourceBlob.stream();
        },
        filesIterator(folderToDownload.folderId, folderToDownload.folderUuid as string, workspaceId),
        zip,
      );

      totalSize += files.reduce((a, f) => f.size + a, 0);

      const folders = await addAllFoldersToZip(
        folderToDownload.name,
        foldersIterator(folderToDownload.folderId, folderToDownload.folderUuid as string, workspaceId),
        zip,
      );

      pendingFolders.push(
        ...folders.map((f) => {
          return {
            name: folderToDownload.name + '/' + (f.plainName ?? f.name),
            folderId: f.id,
            folderUuid: f.uuid,
          };
        }),
      );
    } while (pendingFolders.length > 0);

    if (options?.closeWhenFinished === undefined || options.closeWhenFinished === true) {
      updateProgress(1);
      await zip.close();
    }
  } catch (err) {
    const castedError = errorService.castError(err);
    analyticsService.trackFileDownloadError({
      ...trackingDownloadProperties,
      error_message_user: 'Error downloading folder',
      error_message: castedError.message,
      stack_trace: castedError.stack ?? '',
    });
    zip.abort();
    throw castedError;
  }
}

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
      const user = localStorageService.getUser() as UserSettings;
      analyticsService.trackMoveItem('folder', {
        file_id: response.item.id,
        email: user.email,
        platform: DevicePlatform.Web,
      });
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

  return storageClient
    .moveFolderByUuid(payload)
    .then((response) => {
      const user = localStorageService.getUser() as UserSettings;
      analyticsService.trackMoveItem('folder', {
        uuid: response.uuid,
        email: user.email,
        platform: DevicePlatform.Web,
      });
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
  downloadSharedFolderAsZip,
};

export default folderService;
