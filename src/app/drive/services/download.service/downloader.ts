import { items } from '@internxt/lib';
import { Iterator } from 'app/core/collections';
import { downloadFile } from 'app/network/download';

export interface DownloadableFolder {
  name: string;
  id: number;
}

export interface DownloadableFile {
  name: string;
  id: string;
  type: string;
  encryptionKey: string;
}

async function downloadFolders(
  iterator: Iterator<DownloadableFolder>,
  opts: {
    onFolderRetrieved: (
      folder: DownloadableFolder,
      onFolderCreated: (err: Error | null) => void
    ) => void
  }
): Promise<void> {
  const { done, value } = await iterator.next();
  let allFoldersDownloaded = done;
  let folders: DownloadableFolder[] = value;

  if (folders.length === 0) return;

  do {
    const moreFolders = iterator.next();

    for (const folder of folders) {
      await new Promise((resolve, reject) => {
        opts.onFolderRetrieved(folder, (err) => {
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
  iterator: Iterator<DownloadableFile>,
  bucket: string,
  opts: {
    onFileRetrieved: (
      file: DownloadableFile & {
        stream: ReadableStream<Uint8Array>
      },
      onFileDownloaded: (err: Error | null) => void
    ) => void
  },
  token?: string
): Promise<void> {
  const { value, done } = await iterator.next();
  let allFilesDownloaded = done;
  let files: DownloadableFile[] = value;

  if (files.length === 0) return;

  do {
    /* Load next chunk while downloading files */
    const nextChunkPromise = iterator.next();

    for (const file of files) {
      const displayFilename = items.getItemDisplayName({
        name: file.name,
        type: file.type,
      });

      const readable = await downloadFile({
        bucketId: bucket,
        fileId: (file as any).fileId,
        encryptionKey: Buffer.from(file.encryptionKey, 'hex'),
        token
      });

      await new Promise((resolve, reject) => {
        opts.onFileRetrieved({
          ...file,
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

export class FolderLevel {
  private filesIterator: Iterator<DownloadableFile>;
  private foldersIterator: Iterator<DownloadableFolder>;
  private bucket: string;
  private token?: string;

  constructor(
    foldersIterator: Iterator<DownloadableFolder>,
    filesIterator: Iterator<DownloadableFile>,
    bucket: string,
    token?: string
  ) {
    this.token = token;
    this.bucket = bucket;
    this.filesIterator = filesIterator;
    this.foldersIterator = foldersIterator;
  }

  async download(opts: {
    onFileRetrieved: (
      file: DownloadableFile & {
        stream: ReadableStream<Uint8Array>
      },
      onFileDownloaded: (err: Error | null) => void
    ) => void,
    onFolderRetrieved: (
      folder: DownloadableFolder,
      onFolderCreated: (err: Error | null) => void
    ) => void
  }): Promise<void> {
    await downloadFiles(this.filesIterator, this.bucket, opts, this.token);
    await downloadFolders(this.foldersIterator, opts);
  }
}