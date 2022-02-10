import { ShareTypes } from '@internxt/sdk/dist/drive';
import { getSharedDirectoryFiles, getSharedDirectoryFolders } from 'app/share/services/share.service';
import JSZip from 'jszip';
import { Readable } from 'stream';
import streamSaver from 'streamsaver';

import { Network } from '../../network';

interface FolderPackage {
  folderId: number;
  pack: JSZip;
}

export async function putDirectoryFilesInsideZip(
  zip: JSZip,
  bucket: string,
  bucketToken: string,
  payload: Omit<ShareTypes.GetSharedDirectoryFilesPayload, 'offset'>,
) {
  const network = new Network('NONE', 'NONE', 'NONE');
  let offset = 0;
  let allFilesDownloaded = false;

  while (!allFilesDownloaded) {
    const { files, last } = await getSharedDirectoryFiles({ ...payload, offset });

    for (const file of files) {
      const [fileStreamPromise, actionState] = network.getFileDownloadStream(bucket, file.id, {
        fileEncryptionKey: Buffer.from(file.encryptionKey, 'hex'),
        fileToken: bucketToken,
        progressCallback: (fileProgress) => {
          // downloadingSize[file.id] = file.size * fileProgress;
          // const totalDownloadedSize = Object.values(downloadingSize).reduce((t, x) => t + x, 0);
          // const totalProgress = totalDownloadedSize / this.state.info.size;
          // this.updateProgress(totalProgress);
        },
      });
      const fileStream = await fileStreamPromise;
      zip.file(`${file.name}.${file.type}`, fileStream, { compression: 'DEFLATE' });
    }

    allFilesDownloaded = last;
    offset += payload.limit;
  }
}

export async function downloadSharedFolderUsingStreamSaver(
  sharedFolderMeta: { name: string; id: number; token: string; code: string },
  bucket: string,
  bucketToken: string,
  options: {
    foldersLimit: number;
    filesLimit: number;
  },
) {
  let currentOffset = 0;
  const zip = new JSZip();
  const writableStream = streamSaver.createWriteStream(`${sharedFolderMeta.name}.zip`, {});
  const writer = writableStream.getWriter();

  const rootFolder: FolderPackage = {
    folderId: sharedFolderMeta.id,
    pack: zip,
  };
  const pendingFolders: FolderPackage[] = [rootFolder];

  let folderDownloadCompleted = false;

  do {
    const folderToDownload = pendingFolders.shift() as FolderPackage;

    console.log('downloading folder %s', folderToDownload.folderId);

    while (!folderDownloadCompleted) {
      const payload: ShareTypes.GetSharedDirectoryFoldersPayload = {
        token: sharedFolderMeta.token,
        directoryId: folderToDownload.folderId,
        offset: currentOffset,
        limit: options.foldersLimit,
      };

      const nextFoldersChunkPromise = getSharedDirectoryFolders(payload).then((foldersResponse) => {
        foldersResponse.folders.forEach(({ id, name }) => {
          pendingFolders.push({
            folderId: id,
            pack: folderToDownload.pack.folder(name),
          });
        });

        return foldersResponse;
      });

      await putDirectoryFilesInsideZip(folderToDownload.pack, bucket, bucketToken, {
        token: sharedFolderMeta.token,
        code: sharedFolderMeta.code,
        directoryId: folderToDownload.folderId,
        limit: options.filesLimit,
      });

      const { last } = await nextFoldersChunkPromise;

      folderDownloadCompleted = last;
      currentOffset += options.foldersLimit;
    }
  } while (pendingFolders.length > 0);

  return new Promise<void>((resolve, reject) => {
    const folderStream = zip.generateInternalStream({
      type: 'uint8array',
      streamFiles: true,
      compression: 'DEFLATE',
    }) as Readable;
    folderStream
      ?.on('data', (chunk: Buffer) => {
        console.log('folder data here');
        writer.write(chunk);
      })
      .on('error', (err) => {
        reject(err);
      })
      .on('end', () => {
        writer.close();
        window.removeEventListener('unload', writer.abort);
        resolve();
      });

    folderStream.resume();
  });
}
