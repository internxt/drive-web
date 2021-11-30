import JSZip from 'jszip';
import fileDownload from 'js-file-download';
import { items } from '@internxt/lib';

import { DriveFolderData, FolderTree } from '../../../types';
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
  isTeam,
}: {
  folder: DriveFolderData;
  decryptedCallback?: () => void;
  updateProgressCallback?: (progress: number) => void;
  isTeam: boolean;
}): Promise<void> {
  const zip = new JSZip();
  const { tree, folderDecryptedNames, fileDecryptedNames, size } = await folderService.fetchFolderTree(folder.id);
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
      const [fileBlobPromise] = fetchFileBlob(file.fileId, {
        isTeam,
        updateProgressCallback: (fileProgress) => {
          const totalProgress = (downloadedSize + file.size * fileProgress) / size;

          (updateProgressCallback || (() => undefined))(totalProgress);
        },
      });
      const fileBlob = await fileBlobPromise;

      downloadedSize += file.size;

      // currentFolderZip?.
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
