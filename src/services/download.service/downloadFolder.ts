import { items } from '@internxt/lib';
import fileDownload from 'js-file-download';
import JSZip from 'jszip';

import { DriveFolderData, FolderTree } from '../../models/interfaces';
import folderService, { fetchFolderContent } from '../folder.service';
import fetchFileBlob from './fetchFileBlob';

/**
 * @description Download a folder keeping all file blobs in memory
 *
 * @param folderData
 * @param isTeam
 */
export default async function downloadFolder(
  rootFolderData: DriveFolderData,
  updateProgressCallback: (progress: number) => void,
  isTeam: boolean,
) {
  const zip = new JSZip();
  const { tree, folderDecryptedNames, fileDecryptedNames, size } = await folderService.fetchFolderTree(
    rootFolderData.id,
  );
  const downloadedSize = 0;

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
      const [fileBlobPromise] = fetchFileBlob(file.fileId, { isTeam, updateProgressCallback: () => undefined });
      const fileBlob = await fileBlobPromise;

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
    fileDownload(content, `${rootFolderData.name}.zip`, 'application/zip');
  });

  return folderContent;
}
