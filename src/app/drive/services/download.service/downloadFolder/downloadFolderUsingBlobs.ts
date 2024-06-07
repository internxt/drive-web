import { items } from '@internxt/lib';
import fileDownload from 'js-file-download';
import JSZip from 'jszip';

import { DriveFolderData, FolderTree } from '../../../types';
import folderService from '../../folder.service';
import fetchFileBlob from '../fetchFileBlob';

// Función para generar un Blob de 2GB
function generarBlobDe2GB() {
  // Definir el tamaño en bytes de 2GB (2 * 1024 * 1024 * 1024)
  const tamanio2GB = 3.5 * 1024 * 1024 * 1024;

  // Crear un array de bytes (Uint8Array) del tamaño deseado
  // Debido a limitaciones de memoria, es posible que necesitemos hacerlo en partes
  const chunkSize = 64 * 1024 * 1024; // Tamaño del chunk, por ejemplo, 64MB
  const numChunks = Math.ceil(tamanio2GB / chunkSize);

  const chunks = [] as Uint8Array[];
  for (let i = 0; i < numChunks; i++) {
    // Crear un chunk de 64MB (puede variar según las limitaciones de memoria)
    const chunk = new Uint8Array(chunkSize);
    chunks.push(chunk);
  }

  // Crear el Blob a partir de los chunks
  const blob = new Blob(chunks, { type: 'application/octet-stream' });

  // Verificar el tamaño del Blob
  console.log(`Blob generado de tamaño: ${blob.size} bytes`);

  return blob;
}

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
}: {
  folder: DriveFolderData;
  decryptedCallback?: () => void;
  updateProgressCallback?: (progress: number) => void;
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

      const fileBlobPromise = fetchFileBlob(
        { ...file, bucketId: file.bucket },
        {
          updateProgressCallback: (fileProgress) => {
            const totalProgress = (downloadedSize + file.size * fileProgress) / size;

            (updateProgressCallback || (() => undefined))(totalProgress);
          },
        },
      );
      const fileBlob = await fileBlobPromise;
      // const fileBlob = generarBlobDe2GB();

      console.log('fileBlob', fileBlob);
      downloadedSize += parseInt(file.size.toString());
      console.log('downloadedSize', downloadedSize);

      currentFolderZip?.file(displayFilename, fileBlob);
    }
    console.log('currentFolderZip', currentFolderZip);
    // * Adds current folder folders to pending
    pendingFolders.push(
      ...folders.map((data) => ({
        parentFolder: currentFolderZip,
        data,
      })),
    );
  }
  console.log('before folderContent');
  const folderContent = await zip
    .generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
    .then((content) => {
      console.log('content', content);
      fileDownload(content, `${folder.name}.zip`, 'application/zip');
    });
  console.log('folderContent', folderContent);

  return folderContent;
}
