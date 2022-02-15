import { items } from '@internxt/lib';
import errorService from 'app/core/services/error.service';
import { getSharedDirectoryFiles, getSharedDirectoryFolders } from 'app/share/services/share.service';
import fileDownload from 'js-file-download';
import JSZip from 'jszip';

import { Network } from '../../network';

interface FolderPackage {
  folderId: number;
  name: string;
  pack: JSZip;
}

export async function downloadSharedFolderUsingBlobs(
  sharedFolderMeta: { name: string; id: number; token: string; code: string; size: number },
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

  const progressIntervalId = setInterval(() => {
    const totalDownloadedSize = Object.values(downloadingSize).reduce((t, x) => t + x, 0);
    const totalProgress = (totalDownloadedSize / sharedFolderMeta.size) - 0.01;

    (options.progressCallback || (() => undefined))(totalProgress >= 0 ? totalProgress : 0);
  }, 1000);

  const rootFolder: FolderPackage = {
    folderId: sharedFolderMeta.id,
    pack: zip,
    name: sharedFolderMeta.name
  };
  const pendingFolders: FolderPackage[] = [rootFolder];

  try {
    // * Renames files iterating over folders
    do {
      const folderToDownload = pendingFolders.shift() as FolderPackage;
      const currentFolderZip = folderToDownload.pack?.folder(folderToDownload.name) || zip;

      let filesDownloadNotFinished = false;
      let foldersOffset = 0;
      let filesOffset = 0;
      let lastFolderId = 0;

      while (!filesDownloadNotFinished) {
        const { files, last } = await getSharedDirectoryFiles({
          token: sharedFolderMeta.token,
          directoryId: folderToDownload.folderId,
          offset: filesOffset,
          limit: options.foldersLimit,
          code: sharedFolderMeta.code
        });

        filesOffset += options.filesLimit;
        filesDownloadNotFinished = last;

        // * Downloads current folder files
        for (const file of files) {
          console.log('downloading file %s', file.name);
          const displayFilename = items.getItemDisplayName({
            name: file.name,
            type: file.type,
          });
          const [fileStreamPromise] = network.downloadFile(bucket, file.id, {
            fileEncryptionKey: Buffer.from(file.encryptionKey, 'hex'),
            fileToken: bucketToken,
            progressCallback: (fileProgress) => {
              downloadingSize[file.id] = file.size * fileProgress;
            },
          });
          const fileBlob = await fileStreamPromise;
          console.log('file %s downloaded', file.name);
          currentFolderZip?.file(displayFilename, fileBlob);
          console.log('file %s zipped', file.name);
        }
      }

      if (lastFolderId != folderToDownload.folderId) {
        foldersOffset = 0;
      }
      const { folders } = await getSharedDirectoryFolders({
        token: sharedFolderMeta.token,
        directoryId: folderToDownload.folderId,
        offset: foldersOffset,
        limit: options.foldersLimit,
      });
      lastFolderId = folderToDownload.folderId;

      pendingFolders.push(
        ...folders.map((data) => ({
          pack: currentFolderZip,
          folderId: data.id,
          name: data.name
        })),
      );

      foldersOffset += options.foldersLimit;
    } while (pendingFolders.length > 0);
  } catch (err) {
    throw errorService.castError(err);
  } finally {
    clearInterval(progressIntervalId);
  }

  return zip
    .generateAsync({
      type: 'blob',
    })
    .then((content) => {
      options.progressCallback(1);
      fileDownload(content, `${sharedFolderMeta.name}.zip`, 'application/zip');
    });
}
