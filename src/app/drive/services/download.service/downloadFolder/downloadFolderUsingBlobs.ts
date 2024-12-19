import { items } from '@internxt/lib';
import fileDownload from 'js-file-download';
import JSZip from 'jszip';

import { FolderTree } from '@internxt/sdk/dist/drive/storage/types';
import { DriveFolderData } from '../../../types';
import folderService from '../../folder.service';
import fetchFileBlob from '../fetchFileBlob';

/**
 * @description Downloads a folder keeping all file blobs in memory
 *
 * @param folderData
 * @param isTeam
 */
export default async function downloadFolderUsingBlobs({
  folder,
  decryptedCallback,
  updateProgressCallback,
  incrementItemCount,
  isWorkspace,
}: {
  folder: DriveFolderData;
  decryptedCallback?: () => void;
  updateProgressCallback?: (progress: number) => void;
  incrementItemCount?: () => void;
  isWorkspace: boolean;
}): Promise<void> {
  const zip = new JSZip();
  const { tree, folderDecryptedNames, fileDecryptedNames, size } = await folderService.fetchFolderTree(folder.uuid);
  let downloadedSize = 0;

  decryptedCallback?.();

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

      const fileBlobPromise = fetchFileBlob(
        { ...file, bucketId: file.bucket },
        {
          updateProgressCallback: (fileProgress) => {
            const totalProgress = (downloadedSize + file.size * fileProgress) / size;

            (updateProgressCallback || (() => undefined))(totalProgress);
          },
          incrementItemCount,
          isWorkspace,
        },
      );
      const fileBlob = await fileBlobPromise;

      downloadedSize += file.size;

      currentFolderZip?.file(displayFilename, fileBlob);
    }

    // * Adds current folder folders to pending
    pendingFolders.push(
      ...folders.map((data) => ({
        parentFolder: currentFolderZip,
        data,
      })),
    );
  }

  const folderContent = await zip.generateAsync({ type: 'blob' }).then((content) => {
    fileDownload(content, `${folder.name}.zip`, 'application/zip');
  });

  return folderContent;
}
