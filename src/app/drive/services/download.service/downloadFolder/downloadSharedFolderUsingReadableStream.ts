import { EventEmitter } from 'events';
import { createWriteStream } from 'streamsaver';

import errorService from 'app/core/services/error.service';
import { DownloadableFile, DownloadableFolder, FolderLevel } from '../downloader';
import { SharedDirectoryFolderIterator, SharedFolderFilesIterator } from '../../../../share/services/folder.service';
import createZipReadable from './zipStream';
import { Iterator } from 'app/core/collections';

interface FolderRef {
  name: string
  folderId: number
}

type FileType = 'file';
type FolderType = 'folder';
type Downloadable<T> = {
  name: string,
  stream: T extends FileType ? ReadableStream : undefined
};
type Downloadables = Record<string, Downloadable<FileType | FolderType>>;

export async function downloadSharedFolderUsingReadableStream(
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
  let downloadedBytes = 0;

  const progressIntervalId = setInterval(() => {
    options.progressCallback(downloadedBytes);
  }, 1000);

  const rootFolder: FolderRef = {
    name: sharedFolderMeta.name,
    folderId: sharedFolderMeta.id,
  };

  const eventBus = new EventEmitter();
  const downloadables: Downloadables = {};

  const readableZipStream = createZipReadable({
    start(ctrl) {
      ctrl.enqueue({ name: rootFolder.name, directory: true });
    },
    async pull(ctrl: {
      enqueue: (content: {
        name: string
        stream?: () => ReadableStream<Uint8Array> | undefined, directory?: boolean
      }) => void,
      close: () => void
    }) {

      eventBus.emit('task-processed');

      return new Promise((resolve: (fileOrFolderId: number | null, type: 'file' | 'folder') => void, reject) => {
        eventBus
          .once('file-ready', (fileId: number) => resolve(fileId, 'file'))
          .once('folder-ready', (folderId: number) => resolve(folderId, 'folder'))
          .once('end', () => resolve(null, 'file'))
          .once('error', reject);
      }).then((fileOrFolderId) => {
        if (!fileOrFolderId) {
          return ctrl.close();
        }
        const fileOrFolder = downloadables[fileOrFolderId];

        if (fileOrFolder.stream) {
          ctrl.enqueue({
            name: fileOrFolder.name,
            stream: () => fileOrFolder.stream
          });
        } else {
          ctrl.enqueue({ name: fileOrFolder.name, directory: true });
        }
      });
    },
  });

  const passThrough = new ReadableStream({
    async start(controller) {
      let ended = false;
      const reader = readableZipStream.getReader();

      while (!ended) {
        const { value, done } = await reader.read();

        if (!done) {
          downloadedBytes += (value as Uint8Array).length;
          controller.enqueue(value);
        } else {
          ended = true;
        }
      }

      await reader.closed;
      controller.close();
    }
  });

  const abortable = new AbortController();
  let error: Error | null = null;

  try {
    const zipDownloadPromise = passThrough.pipeTo(
      createWriteStream(rootFolder.name + '.zip'),
      { signal: abortable.signal }
    );
    const pendingFolders: FolderRef[] = [rootFolder];

    do {
      const folderToDownload = pendingFolders.shift() as FolderRef;

      const sharedDirectoryFilesIterator: Iterator<DownloadableFile> =
        new SharedFolderFilesIterator({
          token: sharedFolderMeta.token,
          directoryId: folderToDownload.folderId,
          code: sharedFolderMeta.code
        }, options.filesLimit);

      const sharedDirectoryFoldersIterator: Iterator<DownloadableFolder> =
        new SharedDirectoryFolderIterator({
          token: sharedFolderMeta.token,
          directoryId: folderToDownload.folderId,
        }, options.foldersLimit);

      const folderLevel = new FolderLevel(
        sharedDirectoryFoldersIterator,
        sharedDirectoryFilesIterator,
        bucket,
        bucketToken
      );

      await folderLevel.download({
        onFileRetrieved: ({ name, id, stream }, onFileDownloaded) => {
          const fullPath = folderToDownload.name + '/' + name;

          downloadables[id] = { name: fullPath, stream };
          eventBus.once('task-processed', onFileDownloaded);
          eventBus.emit('file-ready', id);
        },
        onFolderRetrieved: ({ name, id }, onFolderDownloaded) => {
          const fullPath = folderToDownload.name + '/' + name;

          downloadables[id] = { name: fullPath, stream: undefined };
          eventBus.once('task-processed', onFolderDownloaded);
          eventBus.emit('folder-ready', id);
          pendingFolders.push({ folderId: id, name: fullPath });
        }
      }).catch((err) => {
        error = err;
        abortable.abort();
      });
    } while (pendingFolders.length > 0);

    eventBus.emit('end');

    await zipDownloadPromise;
    options.progressCallback(downloadedBytes);
  } catch (err) {
    throw errorService.castError(error ?? err);
  } finally {
    clearInterval(progressIntervalId);
  }
}
