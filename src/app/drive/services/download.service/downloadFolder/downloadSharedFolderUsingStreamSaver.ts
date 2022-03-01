import errorService from 'app/core/services/error.service';
import i18n from 'app/i18n/services/i18n.service';
import { getSharedDirectoryFiles, getSharedDirectoryFolders } from 'app/share/services/share.service';
import JSZip from 'jszip';
import { Readable } from 'stream';
import streamSaver from 'streamsaver';
import { items } from '@internxt/lib';

import { Network } from '../../network/network';

interface FolderPackage {
  folderId: number;
  pack: JSZip;
}

export async function downloadSharedFolderUsingStreamSaver(
  sharedFolderMeta: {
    name: string;
    id: number;
    token: string;
    code: string;
    size: number;
  },
  bucket: string,
  bucketToken: string,
  options: {
    foldersLimit: number;
    filesLimit: number;
    progressCallback: (progress: number) => void;
  },
): Promise<void> {
  const downloadingSize: Record<number, number> = {};
  const network = new Network('NONE', 'NONE', 'NONE');
  const zip = new JSZip();
  const isBrave = !!(navigator.brave && (await navigator.brave.isBrave()));

  if (isBrave) {
    throw new Error(i18n.get('error.browserNotSupported', { userAgent: 'Brave' }));
  }

  const writableStream = streamSaver.createWriteStream(`${sharedFolderMeta.name}.zip`, {});
  const writer = writableStream.getWriter();
  const onUnload = () => {
    writer.abort();
  };

  const rootFolder: FolderPackage & { name: string } = {
    name: sharedFolderMeta.name,
    folderId: sharedFolderMeta.id,
    pack: zip,
  };
  const pendingFolders: (FolderPackage & { name: string })[] = [rootFolder];

  try {
    // * Renames files iterating over folders
    do {
      const folderToDownload = pendingFolders.shift() as FolderPackage & { name: string };
      const currentFolderZip = folderToDownload.pack?.folder(folderToDownload.name) || zip;

      let filesDownloadNotFinished = false;
      let filesOffset = 0;

      while (!filesDownloadNotFinished) {
        const { files, last } = await getSharedDirectoryFiles({
          token: sharedFolderMeta.token,
          directoryId: folderToDownload.folderId,
          offset: filesOffset,
          limit: options.foldersLimit,
          code: sharedFolderMeta.code,
        });

        filesOffset += options.filesLimit;
        filesDownloadNotFinished = last;

        // * Downloads current folder files
        for (const file of files) {
          const displayFilename = items.getItemDisplayName({
            name: file.name,
            type: file.type,
          });
          const [fileStreamPromise] = network.getFileDownloadStream(bucket, file.id, {
            fileEncryptionKey: Buffer.from(file.encryptionKey, 'hex'),
            fileToken: bucketToken,
            progressCallback: (fileProgress) => {
              downloadingSize[file.id] = file.size * fileProgress;
              const totalDownloadedSize = Object.values(downloadingSize).reduce((t, x) => t + x, 0);
              const totalProgress = totalDownloadedSize / sharedFolderMeta.size;

              (options.progressCallback || (() => undefined))(totalProgress);
            },
          });
          const fileStream = await fileStreamPromise;

          currentFolderZip?.file(displayFilename, fileStream, { compression: 'DEFLATE' });
        }
      }

      let foldersOffset = 0;
      let completed = false;
      while (!completed) {
        const { folders, last } = await getSharedDirectoryFolders({
          token: sharedFolderMeta.token,
          directoryId: folderToDownload.folderId,
          offset: foldersOffset,
          limit: options.foldersLimit,
        });

        folders.map(async ({ id, name }) => {
          pendingFolders.push({
            folderId: id,
            name: name,
            pack: currentFolderZip,
          });
        });

        completed = last;
        foldersOffset += options.foldersLimit;
      }
    } while (pendingFolders.length > 0);

    window.addEventListener('unload', onUnload);

    return new Promise<void>((resolve, reject) => {
      const folderStream = zip.generateInternalStream({
        type: 'uint8array',
        streamFiles: true,
        compression: 'DEFLATE',
      }) as Readable;
      folderStream
        ?.on('data', (chunk: Buffer) => {
          writer.write(chunk);
        })
        .on('end', () => {
          writer.close();
          window.removeEventListener('unload', onUnload);
          resolve();
        })
        .on('error', (err) => {
          reject(err);
        });

      folderStream.resume();
    });
  } catch (err) {
    const castedError = errorService.castError(err);

    writer.abort();

    throw castedError;
  }
}
