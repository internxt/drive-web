import { SharedDirectoryFolder } from '@internxt/sdk/dist/drive/share/types';
import errorService from 'app/core/services/error.service';
import { get } from 'app/i18n/services/i18n.service';
import { DownloadableFile, DownloadableFolder, FolderLevel } from '../downloader';
import { SharedDirectoryFolderIterator, SharedFolderFilesIterator } from '../../../../share/services/folder.service';
import { Iterator } from 'app/core/collections';

interface FolderRef {
  name: string;
  folderId: number;
  parentId: number;
  handle: FileSystemDirectoryHandle;
}

export async function downloadSharedFolderUsingFileSystemAPI(
  sharedFolderMeta: {
    name: string;
    id: number;
    token: string;
    code: string;
    password?: string;
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
    throw new Error(get('error.browserNotSupported', { userAgent: 'Brave' }));
  }

  const getTotalDownloadedBytes = () => {
    return Object.values(downloads).reduce((t, x) => t + x, 0);
  };

  const progressIntervalId = setInterval(() => {
    (options.progressCallback || (() => undefined))(getTotalDownloadedBytes());
  }, 1000);

  try {
    const fsDirectoryHandle = await window.showDirectoryPicker({ startIn: 'downloads' });

    const sharedFolderDirectoryHandle = await fsDirectoryHandle.getDirectoryHandle(sharedFolderMeta.name, {
      create: true,
    });

    const rootFolder: FolderRef = {
      name: sharedFolderMeta.name,
      folderId: sharedFolderMeta.id,
      parentId: sharedFolderMeta.id,
      handle: sharedFolderDirectoryHandle,
    };
    const pendingFolders: FolderRef[] = [rootFolder];

    do {
      const folderToDownload = pendingFolders.shift() as FolderRef;

      const sharedDirectoryFilesIterator: Iterator<DownloadableFile> = new SharedFolderFilesIterator(
        {
          token: sharedFolderMeta.token,
          directoryId: folderToDownload.folderId,
          parentId: folderToDownload.parentId,
          code: sharedFolderMeta.code,
          password: sharedFolderMeta.password,
        },
        options.filesLimit,
      );

      const sharedDirectoryFoldersIterator: Iterator<DownloadableFolder> = new SharedDirectoryFolderIterator(
        {
          token: sharedFolderMeta.token,
          directoryId: folderToDownload.folderId,
          parentId: folderToDownload.parentId,
          password: sharedFolderMeta.password,
        },
        options.foldersLimit,
      );

      const folderLevel = new FolderLevel(
        sharedDirectoryFoldersIterator,
        sharedDirectoryFilesIterator,
        bucket,
        bucketToken,
      );

      const directory = folderToDownload.handle;

      await folderLevel.download({
        onFileRetrieved: async ({ name, id, stream }, onFileDownloaded) => {
          try {
            const downloadedFileHandle = await directory.getFileHandle(name, { create: true });
            const downloadedFileWritable = await downloadedFileHandle.createWritable({ keepExistingData: false });

            downloads[id] = 0;

            const progressStream = new TransformStream({
              transform(chunk, controller) {
                downloads[id] += chunk.length;
                controller.enqueue(chunk);
              },
            });

            await stream.pipeThrough(progressStream).pipeTo(downloadedFileWritable);
            onFileDownloaded(null);
          } catch (err) {
            onFileDownloaded(err as Error);
          }
        },
        onFolderRetrieved: async ({ name, id }, onFolderDownloaded) => {
          try {
            pendingFolders.push({
              folderId: id,
              parentId: folderToDownload.folderId,
              handle: await directory.getDirectoryHandle(name, { create: true }),
              name,
            });
            onFolderDownloaded(null);
          } catch (err) {
            onFolderDownloaded(err as Error);
          }
        },
      });
    } while (pendingFolders.length > 0);
  } catch (err) {
    throw errorService.castError(err);
  } finally {
    clearInterval(progressIntervalId);
    options.progressCallback(getTotalDownloadedBytes());
  }
}
