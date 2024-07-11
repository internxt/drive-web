import { ActionState } from '@internxt/inxt-js/build/api/ActionState';
import { items } from '@internxt/lib';
import JSZip from 'jszip';
import internal from 'stream';
import streamSaver from 'streamsaver';

import { FolderTree } from '@internxt/sdk/dist/drive/storage/types';
import errorService from 'app/core/services/error.service';
import { t } from 'i18next';
import { DriveFileData, DriveFolderData } from '../../../types';
import folderService from '../../folder.service';
import { getEnvironmentConfig, Network } from '../../network.service';

/**
 * @description Downloads a folder using StreamSaver.js
 *
 * ! Using 'jszip' 3.2.0 due to a bug with nodeStream in later versions
 *
 * @param folderData
 * @param isTeam
 */
export default async function downloadFolderUsingStreamSaver({
  folder,
  decryptedCallback,
  updateProgressCallback,
  errorCallback,
  isWorkspace,
}: {
  folder: DriveFolderData;
  decryptedCallback?: () => void;
  updateProgressCallback?: (progress: number) => void;
  errorCallback?: (err: Error) => void;
  isWorkspace: boolean;
}): Promise<[Promise<void>, () => void]> {
  const downloadingSize: Record<number, number> = {};
  const fileStreams: { file: DriveFileData; stream: internal.Readable }[] = [];
  const actionStates: ActionState[] = [];
  const { bridgeUser, bridgePass, encryptionKey } = getEnvironmentConfig(isWorkspace);
  const network = new Network(bridgeUser, bridgePass, encryptionKey);
  const { tree, folderDecryptedNames, fileDecryptedNames, size } = await folderService.fetchFolderTree(folder.uuid);
  const zip = new JSZip();
  const isBrave = !!(navigator.brave && (await navigator.brave.isBrave()));

  if (isBrave) {
    throw new Error(t('error.browserNotSupported', { userAgent: 'Brave' }) as string);
  }

  const writableStream = streamSaver.createWriteStream(`${folder.name}.zip`, {});
  const writer = writableStream.getWriter();
  const onUnload = () => {
    writer.abort();
  };

  decryptedCallback?.();

  try {
    // * Renames files iterating over folders
    const pendingFolders: { parentFolder: JSZip | null; data: FolderTree }[] = [{ parentFolder: null, data: tree }];
    while (pendingFolders.length > 0) {
      const currentFolder = pendingFolders[0];
      const currentFolderZip = currentFolder.parentFolder?.folder(folderDecryptedNames[currentFolder.data.id]) || zip;
      const { files, folders } = {
        files: currentFolder.data.files,
        folders: currentFolder.data.children,
      };

      pendingFolders.shift();

      // * Downloads current folder files
      for (const file of files) {
        const displayFilename = items.getItemDisplayName({
          name: fileDecryptedNames[file.id],
          type: file.type,
        });
        const [fileStreamPromise, actionState] = network.getFileDownloadStream(file.bucket, file.fileId, {
          progressCallback: (fileProgress) => {
            downloadingSize[file.id] = file.size * fileProgress;
            const totalDownloadedSize = Object.values(downloadingSize).reduce((translate, x) => translate + x, 0);
            const totalProgress = totalDownloadedSize / size;

            (updateProgressCallback || (() => undefined))(totalProgress);
          },
        });
        const fileStream = await fileStreamPromise;

        currentFolderZip?.file(displayFilename, fileStream, { compression: 'DEFLATE' });

        fileStreams.push({ file, stream: fileStream });
        actionState && actionStates.push(actionState);
      }

      // * Adds current folder folders to pending
      pendingFolders.push(
        ...folders.map((data) => ({
          parentFolder: currentFolderZip,
          data,
        })),
      );
    }

    window.addEventListener('unload', onUnload);

    return [
      new Promise<void>((resolve, reject) => {
        const folderStream = zip.generateInternalStream({
          type: 'uint8array',
          streamFiles: true,
          compression: 'DEFLATE',
        }) as internal.Readable;
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
            errorCallback?.(err);
            reject(err);
          });

        folderStream.resume();
      }),
      () => {
        for (const actionState of actionStates) {
          actionState?.stop();
        }

        writer.abort();
      },
    ];
  } catch (err) {
    const castedError = errorService.castError(err);

    writer.abort();

    throw castedError;
  }
}
