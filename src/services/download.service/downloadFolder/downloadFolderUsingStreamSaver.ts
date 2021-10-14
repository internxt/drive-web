import JSZip from 'jszip';
import { items } from '@internxt/lib';
import streamToPromise from 'stream-to-promise';
import streamSaver from 'streamsaver';

import { getEnvironmentConfig, Network } from '../../../lib/network';
import { DriveFolderData, FolderTree } from '../../../models/interfaces';
import errorService from '../../error.service';
import folderService from '../../folder.service';
import internal from 'stream';
import { ActionState } from '@internxt/inxt-js/build/api/ActionState';

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
  isTeam,
}: {
  folder: DriveFolderData;
  decryptedCallback?: () => void;
  updateProgressCallback?: (progress: number) => void;
  errorCallback?: (err: Error) => void;
  isTeam: boolean;
}) {
  const downloadingSize: Record<number, number> = {};
  const fileStreams: internal.Readable[] = [];
  const actionStates: ActionState[] = [];
  const { bucketId, bridgeUser, bridgePass, encryptionKey } = getEnvironmentConfig(isTeam);
  const network = new Network(bridgeUser, bridgePass, encryptionKey);
  const zip = new JSZip();
  const { tree, folderDecryptedNames, fileDecryptedNames, size } = await folderService.fetchFolderTree(folder.id);
  const writableStream = streamSaver.createWriteStream(`${folder.name}.zip`, {});
  const writer = writableStream.getWriter();

  decryptedCallback?.();

  try {
    // * Renames files iterating over folders
    const pendingFolders: { parentFolder: JSZip | null; data: FolderTree }[] = [{ parentFolder: zip, data: tree }];
    while (pendingFolders.length > 0) {
      const currentFolder = pendingFolders[0];
      const currentFolderZip = currentFolder.parentFolder?.folder(folderDecryptedNames[currentFolder.data.id]) || null;
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
        const [fileStreamPromise, actionState] = network.getFileDownloadStream(bucketId, file.fileId, {
          progressCallback: (fileProgress) => {
            downloadingSize[file.id] = file.size * fileProgress;
            const totalDownloadedSize = Object.values(downloadingSize).reduce((t, x) => t + x, 0);
            const totalProgress = totalDownloadedSize / size;

            (updateProgressCallback || (() => undefined))(totalProgress);
          },
        });
        const fileStream = await fileStreamPromise;
        fileStream
          .on('data', () => undefined)
          .once('end', () => {
            console.log('(downloadFolder.ts) fileStream end: ', file.id, ' - size: ', file.size);
          })
          .once('error', (err) => {
            writer.abort();
            errorCallback?.(err);
          });

        currentFolderZip?.file(displayFilename, fileStream, { compression: 'DEFLATE' });

        fileStreams.push(fileStream);
        actionState && actionStates.push(actionState);

        fileStream.pause();
      }

      // * Adds current folder folders to pending
      pendingFolders.push(
        ...folders.map((data) => ({
          parentFolder: currentFolderZip,
          data,
        })),
      );
    }

    const folderStream = zip.generateNodeStream({ streamFiles: true, compression: 'DEFLATE' }) as NodeJS.ReadableStream;
    folderStream
      ?.on('data', (chunk: Buffer) => {
        writer.write(chunk);
      })
      .once('end', () => {
        console.log('(downloadFolder.ts) folderStream end!');
        writer.close();
      })
      .once('error', (err) => {
        writer.abort();
        errorCallback?.(err);
      });

    // * Streams files one by one
    for (const fileStream of fileStreams) {
      fileStream.resume();
      await streamToPromise(fileStream);
    }

    await streamToPromise(folderStream);
  } catch (err) {
    const castedError = errorService.castError(err);

    writer.abort();

    throw castedError;
  }
}
