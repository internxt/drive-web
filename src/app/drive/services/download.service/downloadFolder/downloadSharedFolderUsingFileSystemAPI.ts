import { items } from '@internxt/lib';
import errorService from 'app/core/services/error.service';
import i18n from 'app/i18n/services/i18n.service';
import { getSharedDirectoryFiles, getSharedDirectoryFolders } from 'app/share/services/share.service';
import { Network } from '../../network';

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
  const isBrave = !!(navigator.brave && (await navigator.brave.isBrave()));

  if (isBrave) {
    throw new Error(i18n.get('error.browserNotSupported', { userAgent: 'Brave' }));
  }

  const progressIntervalId = setInterval(() => {
    const totalDownloadedSize = Object.values(downloadingSize).reduce((t, x) => t + x, 0);
    const totalProgress = totalDownloadedSize / sharedFolderMeta.size;

    (options.progressCallback || (() => undefined))(totalProgress);
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
    // * Renames files iterating over folders
    do {
      const folderToDownload = pendingFolders.shift() as FolderRef;

      let filesDownloadNotFinished = false;
      let filesOffset = 0;

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
          const downloadedFileHandle = await folderToDownload.handle.getFileHandle(displayFilename, { create: true });
          const downloadedFileWritable = await downloadedFileHandle.createWritable({ keepExistingData: false });

          await downloadedFileWritable.write(fileBlob);
          await downloadedFileWritable.close();
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
            name,
            handle: await folderToDownload.handle.getDirectoryHandle(name, { create: true })
          });
        });

        completed = last;
        foldersOffset += options.foldersLimit;
      }

    } while (pendingFolders.length > 0);
  } catch (err) {
    throw errorService.castError(err);
  } finally {
    clearInterval(progressIntervalId);
    options.progressCallback(1);
  }
}
