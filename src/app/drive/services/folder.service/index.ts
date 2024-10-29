import errorService from '../../../core/services/error.service';
import httpService from '../../../core/services/http.service';
import { DriveFileData, DriveFolderData, DriveItemData } from '../../types';

import { StorageTypes } from '@internxt/sdk/dist/drive';
import { RequestCanceler } from '@internxt/sdk/dist/shared/http/types';
import { Iterator } from 'app/core/collections';
import { FlatFolderZip } from 'app/core/services/zip.service';
import { downloadFile } from 'app/network/download';
import { t } from 'i18next';
import { SdkFactory } from '../../../core/factory/sdk';
import localStorageService from '../../../core/services/local-storage.service';

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

export async function deleteFolder(folderData: DriveFolderData): Promise<void> {
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
  private readonly queryValues: { directoryId: number };

  constructor(queryValues: { directoryId: number }, limit?: number, offset?: number) {
    this.limit = limit || 5;
    this.offset = offset || 0;
    this.queryValues = queryValues;
  }

  async next() {
    const { directoryId } = this.queryValues;
    const { folders, last } = await httpService.get<GetDirectoryFoldersResponse>(
      `/storage/v2/folders/${directoryId}/folders?limit=${this.limit}&offset=${this.offset}`,
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
      `/storage/v2/folders/${directoryId}/files?limit=${this.limit}&offset=${this.offset}`,
    );

    this.offset += this.limit;

    return { value: files, done: last };
  }
}

interface FolderRef {
  name: string;
  folderId: number;
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

async function addAllFoldersToZip(
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

async function downloadFolderAsZip(
  folderId: DriveFolderData['id'],
  folderName: DriveFolderData['name'],
  updateProgress: (progress: number) => void,
): Promise<void> {
  const rootFolder: FolderRef = { folderId: folderId, name: folderName };
  const pendingFolders: FolderRef[] = [rootFolder];
  let totalSize = 0;
  let totalSizeIsReady = false;

  const zip = new FlatFolderZip(rootFolder.name, {
    // TODO: check why opts.progress is causing zip corruption
    // progress(loadedBytes) {
    //   if (!totalSizeIsReady) {
    //     return;
    //   }
    //   updateProgress(Math.min(loadedBytes / totalSize, 1));
    // },
  });

  const user = localStorageService.getUser();

  if (!user) {
    throw new Error('user null');
  }

  try {
    do {
      const folderToDownload = pendingFolders.shift() as FolderRef;

      const foldersIterator: Iterator<DriveFolderData> = new DirectoryFolderIterator(
        { directoryId: folderToDownload.folderId },
        20,
        0,
      );
      const filesIterator: Iterator<DriveFileData> = new DirectoryFilesIterator(
        { directoryId: folderToDownload.folderId },
        20,
        0,
      );

      const files = await addAllFilesToZip(
        folderToDownload.name,
        (file) => {
          return downloadFile({
            bucketId: file.bucket,
            fileId: file.fileId,
            creds: {
              user: user.bridgeUser,
              pass: user.userId,
            },
            mnemonic: user.mnemonic,
          });
        },
        filesIterator,
        zip,
      );

      totalSize += files.reduce((a, f) => f.size + a, 0);

      const folders = await addAllFoldersToZip(folderToDownload.name, foldersIterator, zip);

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

    await zip.close();
  } catch (err) {
    zip.abort();
    throw errorService.castError(err);
  }
}

export async function moveFolder(folderId: number, destination: number): Promise<StorageTypes.MoveFolderResponse> {
  const storageClient = SdkFactory.getInstance().createStorageClient();
  const payload: StorageTypes.MoveFolderPayload = {
    folderId: folderId,
    destinationFolderId: destination,
  };

  return storageClient.moveFolder(payload).catch((err) => {
    const castedError = errorService.castError(err);
    if (castedError.status) {
      castedError.message = t(`tasks.move-folder.errors.${castedError.status}`);
    }
    throw castedError;
  });
}

const folderService = {
  createFolder,
  deleteFolder,
  moveFolder,
  downloadFolderAsZip,
};

export default folderService;
