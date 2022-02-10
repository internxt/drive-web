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
  updateBytesDownloaded: (bytes: number) => void,
) {
  const network = new Network('NONE', 'NONE', 'NONE');
  let offset = 0;
  let allFilesDownloaded = false;

  const downloads: Record<number, number> = {};

  while (!allFilesDownloaded) {
    const { files, last } = await getSharedDirectoryFiles({ ...payload, offset });
    console.log('downloading files', JSON.stringify(files, null, 2));

    for (const file of files) {
      const [fileStreamPromise, actionState] = network.getFileDownloadStream(bucket, file.id, {
        fileEncryptionKey: Buffer.from(file.encryptionKey, 'hex'),
        fileToken: bucketToken,
        progressCallback: (fileProgress) => {
          downloads[file.id] = file.size * fileProgress;
          const totalDownloadedSize = Object.values(downloads).reduce((t, x) => t + x, 0);
          updateBytesDownloaded(totalDownloadedSize);
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

  const { size: totalSize } = sharedFolderMeta;

  const foldersDownloadedBytes: Record<number, number> = {};

  do {
    const folderToDownload = pendingFolders.shift() as FolderPackage;

    console.log('downloading folder %s', folderToDownload.folderId);

    let folderDownloadCompleted = false;
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

      putDirectoryFilesInsideZip(
        folderToDownload.pack,
        bucket,
        bucketToken,
        {
          token: sharedFolderMeta.token,
          code: sharedFolderMeta.code,
          directoryId: folderToDownload.folderId,
          limit: options.filesLimit,
        },
        (downloadedBytes) => {
          foldersDownloadedBytes[folderToDownload.folderId] = downloadedBytes;
          const totalDownloadedSize = Object.values(foldersDownloadedBytes).reduce((t, x) => t + x, 0);
          options.progressCallback(totalDownloadedSize / totalSize);
        },
      );

      const { last } = await nextFoldersChunkPromise;

      console.log(
        'pending folders',
        JSON.stringify(
          pendingFolders.map((f) => f.folderId),
          null,
          2,
        ),
      );

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
      .on('data', (chunk: Buffer) => {
        console.log('data man');
        writer.write(chunk);
      })
      .on('error', (err) => {
        reject(err);
      })
      .on('end', () => {
        writer.close();
        options.progressCallback(1);
        window.removeEventListener('unload', writer.abort);
        resolve();
      });

    folderStream.resume();
  });
}
