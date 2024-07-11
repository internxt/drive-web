import { items } from '@internxt/lib';

import { FolderTree } from '@internxt/sdk/dist/drive/storage/types';
import { FlatFolderZip } from 'app/core/services/zip.service';
import network from 'app/network';
import { DriveFolderData } from '../../../types';
import folderService from '../../folder.service';
import { getEnvironmentConfig } from '../../network.service';

/**
 * @description Downloads a folder using File System Access API
 * TODO: Load levels paginated instead of loading the entire tree at once.
 * @param folderData
 * @param isWorkspace
 */
export default function downloadFolderUsingFileSystemAccessAPI({
  folder,
  updateProgressCallback,
  isWorkspace,
  abortController,
}: {
  folder: DriveFolderData;
  updateProgressCallback?: (progress: number) => void;
  isWorkspace: boolean;
  abortController?: AbortController;
}): Promise<void> {
  const { bridgeUser, bridgePass, encryptionKey } = getEnvironmentConfig(isWorkspace);

  return downloadFolder(
    folder,
    { bridgeUser, bridgePass, encryptionKey },
    { abortController, updateProgress: updateProgressCallback },
  );
}

async function downloadFolder(
  folder: DriveFolderData,
  environment: { bridgeUser: string; bridgePass: string; encryptionKey: string },
  opts: {
    abortController?: AbortController;
    updateProgress?: (progress: number) => void;
  },
) {
  const { abortController, updateProgress } = opts;
  const { bridgeUser, bridgePass, encryptionKey } = environment;
  const { tree, folderDecryptedNames, fileDecryptedNames, size } = await folderService.fetchFolderTree(folder.uuid);
  const pendingFolders: { path: string; data: FolderTree }[] = [{ path: '', data: tree }];

  const zip = new FlatFolderZip(folder.name, {
    abortController: opts.abortController,
    // TODO: check why progress is causing zip corruption
    // progress: (loadedBytes) => updateProgress?.(loadedBytes / size),
  });

  while (pendingFolders.length > 0 && !abortController?.signal.aborted) {
    const currentFolder = pendingFolders.shift() as { path: string; data: FolderTree };
    const folderPath =
      currentFolder.path + (currentFolder.path === '' ? '' : '/') + folderDecryptedNames[currentFolder.data.id];

    zip.addFolder(folderPath);

    const { files, children: folders } = currentFolder.data;

    for (const file of files) {
      if (abortController?.signal.aborted) {
        throw new Error('Download cancelled');
      }

      const displayFilename = items.getItemDisplayName({
        name: fileDecryptedNames[file.id],
        type: file.type,
      });

      const fileStreamPromise = network.downloadFile({
        bucketId: file.bucket,
        fileId: file.fileId,
        creds: {
          pass: bridgePass,
          user: bridgeUser,
        },
        mnemonic: encryptionKey,
        options: {
          notifyProgress: () => null,
          abortController: opts.abortController,
        },
      });

      zip.addFile(folderPath + '/' + displayFilename, await fileStreamPromise);
    }

    pendingFolders.push(...folders.map((tree) => ({ path: folderPath, data: tree })));
  }

  if (abortController?.signal.aborted) {
    throw new Error('Download cancelled');
  }

  return zip.close();
}
