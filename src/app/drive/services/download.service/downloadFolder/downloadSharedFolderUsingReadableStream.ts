import { items } from '@internxt/lib';
import { SharedDirectoryFile, SharedDirectoryFolder } from '@internxt/sdk/dist/drive/share/types';
import errorService from 'app/core/services/error.service';
import { EventEmitter } from 'events';
import { createWriteStream } from 'streamsaver';
import { downloadFile } from '../../download';
import { Iterator, SharedDirectoryFolderIterator, SharedFolderFilesIterator } from './utils';
import createZipReadable from './zipStream';

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

  const onReadyEmitter = new EventEmitter();
  const downloadables: Downloadables = {};

  const readableZipStream = createZipReadable({
    start(ctrl) {
      ctrl.enqueue({ name: rootFolder.name, directory: true });
    },
    // eslint-disable-next-line max-len
    async pull(ctrl: {
      enqueue: (content: { name: string, stream?: () => ReadableStream<any> | undefined, directory?: boolean }) => void,
      close: () => void
    }) {

      onReadyEmitter.emit('task-processed');

      return new Promise((resolve: (fileOrFolderId: number | null, type: 'file' | 'folder') => void, reject) => {
        onReadyEmitter
          .once('file-ready', (fileId: number) => {
            resolve(fileId, 'file');
          })
          .once('folder-ready', (folderId: number) => {
            resolve(folderId, 'folder');
          })
          .once('end', () => {
            resolve(null, 'file');
          })
          .once('error', (err) => {
            reject(err);
          });
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
          downloadedBytes += value.length;
          controller.enqueue(value);
        } else {
          ended = true;
        }
      }

      await reader.closed;
      controller.close();
    }
  });

  const zipDownloadPromise = passThrough.pipeTo(createWriteStream(rootFolder.name + '.zip'));

  try {
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
        sharedDirectoryFilesIterator,
        bucket,
        bucketToken,
        {
          onFileRetrieved: ({ name, id, stream }, onFileDownloaded) => {
            downloadables[id] = { name, stream };
            onReadyEmitter.once('task-processed', onFileDownloaded);
            onReadyEmitter.emit('file-ready', id);
          }
        }
      );

      await downloadFolders(
        sharedDirectoryFoldersIterator,
        {
          onFolderRetrieved: ({ name, folderId }: FolderRef, onFolderDownloaded) => {
            downloadables[folderId] = { name, stream: undefined };
            onReadyEmitter.once('task-processed', onFolderDownloaded);
            onReadyEmitter.emit('folder-ready', folderId);
          }
        }
      );
    } while (pendingFolders.length > 0);

    onReadyEmitter.emit('end');

    await zipDownloadPromise;
  } catch (err) {
    throw errorService.castError(err);
  } finally {
    clearInterval(progressIntervalId);
    options.progressCallback(downloadedBytes);
  }
}

async function downloadFolders(
  iterator: Iterator<SharedDirectoryFolder>,
  opts: {
    onFolderRetrieved: (folders: FolderRef, onFolderCreated: (err: Error) => void) => void
  }
): Promise<void> {
  const { done, value } = await iterator.next();
  let allFoldersDownloaded = done;
  let folders: SharedDirectoryFolder[] = value;

  do {
    const moreFolders = iterator.next();

    for (const folder of folders) {
      await new Promise((resolve, reject) => {
        opts.onFolderRetrieved({
          folderId: folder.id,
          name: folder.name
        }, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(null);
          }
        });
      });
    }

    const { done, value } = await moreFolders;

    folders = value;
    allFoldersDownloaded = done;
  } while (!allFoldersDownloaded);
}

async function downloadFiles(
  iterator: Iterator<SharedDirectoryFile>,
  bucket: string,
  token: string,
  opts: {
    onFileRetrieved: (
      file: {
        id: string,
        name: string,
        stream: ReadableStream<any>
      },
      onFileDownloaded: (err: Error | null) => void
    ) => void
  }
): Promise<void> {
  const downloads: { [key: SharedDirectoryFile['id']]: number } = {};

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

      downloads[file.id] = 0;

      const [readablePromise] = downloadFile({
        bucketId: bucket,
        fileId: file.id,
        encryptionKey: Buffer.from(file.encryptionKey, 'hex'),
        token
      });

      const readable = await readablePromise;

      await new Promise((resolve, reject) => {
        opts.onFileRetrieved({
          id: file.id,
          name: displayFilename,
          stream: readable
        }, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(null);
          }
        });
      });
    }

    const { done, value } = await nextChunkPromise;
    allFilesDownloaded = done;
    files = value;
  } while (!allFilesDownloaded);
}
