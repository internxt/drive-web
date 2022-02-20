import { items } from '@internxt/lib';
import { SharedDirectoryFile, SharedDirectoryFolder } from '@internxt/sdk/dist/drive/share/types';
import errorService from 'app/core/services/error.service';
import i18n from 'app/i18n/services/i18n.service';
import { downloadFileToFileSystem } from '../../download';
import { Iterator, SharedDirectoryFolderIterator, SharedFolderFilesIterator } from './utils';

interface FolderRef {
  name: string
  folderId: number
  handle: FileSystemDirectoryHandle
}

export async function downloadSharedFolderUsingFileSystemAPI(
  sharedFolderMeta: {
    name: string;
    id: number;
    token: string;
    code: string;
  },
  bucket: string,
  bucketToken: string,
  options: {
    foldersLimit: number;
    filesLimit: number;
    progressCallback: (downloadedBytes: number) => void;
  },
): Promise<void> {
  const downloads: { [key: SharedDirectoryFolder['id']]: number } = {};
  const isBrave = !!(navigator.brave && (await navigator.brave.isBrave()));

  if (isBrave) {
    throw new Error(i18n.get('error.browserNotSupported', { userAgent: 'Brave' }));
  }

  const getTotalDownloadedBytes = () => {
    return Object.values(downloads).reduce((t, x) => t + x, 0);
  };

  const progressIntervalId = setInterval(() => {
    (options.progressCallback || (() => undefined))(getTotalDownloadedBytes());
  }, 1000);

  try {
    const fsDirectoryHandle = await window.showDirectoryPicker({ startIn: 'downloads' });

    const sharedFolderDirectoryHandle = await fsDirectoryHandle
      .getDirectoryHandle(sharedFolderMeta.name, { create: true });

    const rootFolder: FolderRef = {
      name: sharedFolderMeta.name,
      folderId: sharedFolderMeta.id,
      handle: sharedFolderDirectoryHandle
    };
    const pendingFolders: FolderRef[] = [rootFolder];

    do {
      const folderToDownload = pendingFolders.shift() as FolderRef;

      const sharedDirectoryFilesIterator: Iterator<SharedDirectoryFile> =
        new SharedFolderFilesIterator({
          token: sharedFolderMeta.token,
          directoryId: folderToDownload.folderId,
          code: sharedFolderMeta.code
        }, options.filesLimit);

      const sharedDirectoryFoldersIterator: Iterator<SharedDirectoryFolder> =
        new SharedDirectoryFolderIterator({
          token: sharedFolderMeta.token,
          directoryId: folderToDownload.folderId,
        }, options.foldersLimit);

      await downloadFiles(
        folderToDownload.handle,
        sharedDirectoryFilesIterator,
        bucket,
        bucketToken,
        {
          onBytesDownloaded: (bytesDownloaded: number) => {
            downloads[folderToDownload.folderId] = bytesDownloaded;
          }
        }
      );

      await downloadFolders(
        folderToDownload.handle,
        sharedDirectoryFoldersIterator,
        {
          onFoldersRetrieved: (folders: FolderRef[]) => {
            folders.map(folder => {
              pendingFolders.push(folder);
            });
          }
        }
      );
    } while (pendingFolders.length > 0);
  } catch (err) {
    throw errorService.castError(err);
  } finally {
    clearInterval(progressIntervalId);
    options.progressCallback(getTotalDownloadedBytes());
  }
}

async function downloadFolders(
  directory: FileSystemDirectoryHandle,
  iterator: Iterator<SharedDirectoryFolder>,
  opts: {
    onFoldersRetrieved: (folders: FolderRef[]) => void
  }
): Promise<void> {
  const { done, value } = await iterator.next();
  let allFoldersDownloaded = done;
  let folders: SharedDirectoryFolder[] = value;

  do {
    const moreFolders = iterator.next();

    const foldersRefs: FolderRef[] = await Promise.all(folders.map(async ({ id, name }) => {
      return {
        folderId: id,
        name,
        handle: await directory.getDirectoryHandle(name, { create: true })
      };
    }));

    opts.onFoldersRetrieved(foldersRefs);

    const { done, value } = await moreFolders;

    folders = value;
    allFoldersDownloaded = done;
  } while (!allFoldersDownloaded);
}

async function downloadFiles(
  directory: FileSystemDirectoryHandle,
  iterator: Iterator<SharedDirectoryFile>,
  bucket: string,
  token: string,
  opts: {
    onBytesDownloaded?: (bytesDownloaded: number) => void
  }
): Promise<void> {
  const downloads: { [key: SharedDirectoryFile['id']]: number } = {};

  const getTotalDownloadedBytes = () => {
    return Object.values(downloads).reduce((t, x) => t + x, 0);
  };

  const { value, done } = await iterator.next();
  let allFilesDownloaded = done;

  let files: SharedDirectoryFile[] = value;


  do {
    /* Load next chunk while downloading files */
    const nextChunkPromise = iterator.next();

    for (const file of files) {
      const displayFilename = items.getItemDisplayName({
        name: file.name,
        type: file.type,
      });

      const downloadedFileHandle = await directory.getFileHandle(displayFilename, { create: true });
      const downloadedFileWritable = await downloadedFileHandle.createWritable({ keepExistingData: false });

      downloads[file.id] = 0;

      const progressStream = new TransformStream({
        transform(chunk, controller) {
          downloads[file.id] += chunk.length;
          opts.onBytesDownloaded && opts.onBytesDownloaded(getTotalDownloadedBytes());

          controller.enqueue(chunk);
        }
      });

      progressStream.readable.pipeTo(downloadedFileWritable);

      const [fileDownloaded] = downloadFileToFileSystem({
        bucketId: bucket,
        fileId: file.id,
        destination: progressStream.writable,
        encryptionKey: Buffer.from(file.encryptionKey, 'hex'),
        token
      });

      await fileDownloaded;
    }

    const { done, value } = await nextChunkPromise;
    allFilesDownloaded = done;
    files = value;
  } while (!allFilesDownloaded);
}
