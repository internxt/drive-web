import { DriveFileData, DriveFolderData, DriveFolderMetadataPayload, DriveItemData, FolderTree } from '../types';
import errorService from '../../core/services/error.service';
import { aes } from '@internxt/lib';
import httpService from '../../core/services/http.service';
import { DevicePlatform } from '../../core/types';
import analyticsService from '../../analytics/services/analytics.service';
import localStorageService from '../../core/services/local-storage.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { StorageTypes } from '@internxt/sdk/dist/drive';
import { RequestCanceler } from '@internxt/sdk/dist/shared/http/types';
import { SdkFactory } from '../../core/factory/sdk';
import { Iterator } from 'app/core/collections';
import { FlatFolderZip } from 'app/core/services/zip.service';
import { downloadFile } from 'app/network/download';
import { LRUFilesCacheManager } from 'app/database/services/database.service/LRUFilesCacheManager';
import { updateDatabaseFileSourceData } from './database.service';
import { binaryStreamToBlob } from 'app/core/services/stream.service';
import { checkIfCachedSourceIsOlder } from 'app/store/slices/storage/storage.thunks/downloadFileThunk';
import { t } from 'i18next';
import { TrackingPlan } from '../../analytics/TrackingPlan';
import { SharedFiles, SharedFolders } from '@internxt/sdk/dist/drive/share/types';

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

export async function updateMetaData(folderId: number, metadata: DriveFolderMetadataPayload): Promise<void> {
  const storageClient = SdkFactory.getInstance().createStorageClient();
  const payload: StorageTypes.UpdateFolderMetadataPayload = {
    folderId: folderId,
    changes: metadata,
  };
  return storageClient.updateFolder(payload).then(() => {
    const user: UserSettings = localStorageService.getUser() as UserSettings;
    analyticsService.trackFolderRename({
      email: user.email,
      fileId: folderId,
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
  private readonly queryValues: { directoryId: number };

  constructor(queryValues: { directoryId: number }, limit?: number, offset?: number) {
    this.limit = limit || 5;
    this.offset = offset || 0;
    this.queryValues = queryValues;
  }

  async next() {
    const { directoryId } = this.queryValues;
    const { folders, last } = await httpService.get<GetDirectoryFoldersResponse>(
      `/api/storage/v2/folders/${directoryId}/folders?limit=${this.limit}&offset=${this.offset}`,
    );

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
  private readonly queryValues: { directoryId: number };

  constructor(queryValues: { directoryId: number }, limit?: number, offset?: number) {
    this.limit = limit || 5;
    this.offset = offset || 0;
    this.queryValues = queryValues;
  }

  async next() {
    const { directoryId } = this.queryValues;
    const { files, last } = await httpService.get<GetDirectoryFilesResponse>(
      `/api/storage/v2/folders/${directoryId}/files?limit=${this.limit}&offset=${this.offset}`,
    );

    this.offset += this.limit;

    return { value: files, done: last };
  }
}

export const createFoldersIterator = (directoryId: number): Iterator<DriveFolderData> => {
  return new DirectoryFolderIterator({ directoryId }, 20, 0);
};

export const createFilesIterator = (directoryId: number): Iterator<DriveFileData> => {
  return new DirectoryFilesIterator({ directoryId }, 20, 0);
};

interface FolderRef {
  name: string;
  folderId: number;
  folderUuid?: string;
  folderToken?: string;
}

async function addAllFilesToZip(
  currentAbsolutePath: string,
  downloadFile: (file: DriveFileData) => Promise<ReadableStream>,
  iterator: Iterator<DriveFileData>,
  zip: FlatFolderZip,
): Promise<DriveFileData[]> {
  let pack = await iterator.next();
  let files = pack.value;
  let moreFiles = !pack.done;

  const path = currentAbsolutePath;
  const allFiles: DriveFileData[] = [];

  do {
    const nextChunkRequest = iterator.next();

    allFiles.push(...files);

    for (const file of files) {
      const fileStream = await downloadFile(file);
      await zip.addFile(path + '/' + file.name + (file.type ? '.' + file.type : ''), fileStream);
    }

    pack = await nextChunkRequest;
    files = pack.value;
    moreFiles = !pack.done;
  } while (moreFiles);

  return allFiles;
}

async function addAllSharedFilesToZip(
  currentAbsolutePath: string,
  downloadFile: (file: SharedFiles) => Promise<ReadableStream>,
  iterator: Iterator<SharedFiles>,
  zip: FlatFolderZip,
): Promise<{ files: SharedFiles[]; token: string }> {
  let pack = await iterator.next();
  let files = pack.value;
  let moreFiles = !pack.done;

  const path = currentAbsolutePath;
  const allFiles: SharedFiles[] = [];

  do {
    const nextChunkRequest = iterator.next();

    allFiles.push(...files);

    for (const file of files) {
      const fileStream = await downloadFile(file);
      await zip.addFile(path + '/' + file.name + (file.type ? '.' + file.type : ''), fileStream);
    }

    pack = await nextChunkRequest;
    files = pack.value;
    moreFiles = !pack.done;
  } while (moreFiles);

  return { files: allFiles, token: (pack as any)?.token };
}

export async function addAllSharedFoldersToZip(
  currentAbsolutePath: string,
  iterator: Iterator<SharedFolders>,
  zip: FlatFolderZip,
): Promise<{ folders: SharedFolders[]; token: string }> {
  let pack = await iterator.next();
  let folders = pack.value;
  let moreFolders = !pack.done;

  const path = currentAbsolutePath;
  const allFolders: SharedFolders[] = [];

  do {
    const nextChunkRequest = iterator.next();

    allFolders.push(...folders);

    for (const folder of folders) {
      await zip.addFolder(path + '/' + folder.name);
    }

    pack = await nextChunkRequest;
    folders = pack.value;
    moreFolders = !pack.done;
  } while (moreFolders);

  return { folders: allFolders, token: (pack as any)?.token };
}

export async function addAllFoldersToZip(
  currentAbsolutePath: string,
  iterator: Iterator<DriveFolderData>,
  zip: FlatFolderZip,
): Promise<DriveFolderData[]> {
  let pack = await iterator.next();
  let folders = pack.value;
  let moreFolders = !pack.done;

  const path = currentAbsolutePath;
  const allFolders: DriveFolderData[] = [];

  do {
    const nextChunkRequest = iterator.next();

    allFolders.push(...folders);

    for (const folder of folders) {
      await zip.addFolder(path + '/' + folder.name);
    }

    pack = await nextChunkRequest;
    folders = pack.value;
    moreFolders = !pack.done;
  } while (moreFolders);

  return allFolders;
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
      progress(loadedBytes) {
        if (!totalSizeIsReady) {
          return;
        }
        updateProgress(Math.min(loadedBytes / totalSize, 1));
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
          const cachedFile = await lruFilesCacheManager.get(file.id.toString());
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

async function downloadFolderAsZip(
  folderId: DriveFolderData['id'],
  folderName: DriveFolderData['name'],
  foldersIterator: (directoryId: number) => Iterator<DriveFolderData>,
  filesIterator: (directoryId: number) => Iterator<DriveFileData>,
  updateProgress: (progress: number) => void,
  options?: DownloadFolderAsZipOptions,
): Promise<void> {
  const rootFolder: FolderRef = { folderId: folderId, name: folderName };
  const pendingFolders: FolderRef[] = [rootFolder];
  let totalSize = 0;
  let totalSizeIsReady = false;
  const zip =
    options?.destination ||
    new FlatFolderZip(rootFolder.name, {
      progress(loadedBytes) {
        if (!totalSizeIsReady) {
          return;
        }
        updateProgress(Math.min(loadedBytes / totalSize, 1));
      },
    });

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
          const cachedFile = await lruFilesCacheManager.get(file.id.toString());
          const isCachedFileOlder = checkIfCachedSourceIsOlder({ cachedFile, file });

          if (cachedFile?.source && !isCachedFileOlder) {
            updateProgress(1);
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
        filesIterator(folderToDownload.folderId),
        zip,
      );

      totalSize += files.reduce((a, f) => f.size + a, 0);

      const folders = await addAllFoldersToZip(folderToDownload.name, foldersIterator(folderToDownload.folderId), zip);

      pendingFolders.push(
        ...folders.map((f) => {
          return {
            name: folderToDownload.name + '/' + f.name,
            folderId: f.id,
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

async function fetchFolderTree(folderId: number): Promise<{
  tree: FolderTree;
  folderDecryptedNames: Record<number, string>;
  fileDecryptedNames: Record<number, string>;
  size: number;
}> {
  const { tree, size } = await httpService.get<{ tree: FolderTree; size: number }>(`/api/storage/tree/${folderId}`);
  const folderDecryptedNames: Record<number, string> = {};
  const fileDecryptedNames: Record<number, string> = {};

  // ! Decrypts folders and files names
  const pendingFolders: FolderTree[] = [tree];
  while (pendingFolders.length > 0) {
    const currentTree = pendingFolders[0];
    const { folders, files } = {
      folders: currentTree.children,
      files: currentTree.files,
    };

    folderDecryptedNames[currentTree.id] = aes.decrypt(
      currentTree.name,
      `${process.env.REACT_APP_CRYPTO_SECRET2}-${currentTree.parentId}`,
    );

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

const folderService = {
  createFolder,
  updateMetaData,
  moveFolder,
  fetchFolderTree,
  downloadFolderAsZip,
  addAllFoldersToZip,
  downloadSharedFolderAsZip,
};

export default folderService;
