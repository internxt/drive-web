import { items } from '@internxt/lib';

import { getEnvironmentConfig } from '../../network.service';
import { DriveFolderData, FolderTree } from '../../../types';
import folderService from '../../folder.service';
import { FlatFolderZip } from 'app/core/services/stream.service';
import network from 'app/network';
import { Abortable } from 'app/network/Abortable';

/**
 * @description Downloads a folder using File System Access API
 * TODO: Load levels paginated instead of loading the entire tree at once.
 * @param folderData
 * @param isTeam
 */
export default function downloadFolderUsingFileSystemAccessAPI({
  folder,
  updateProgressCallback,
  isTeam,
  abortController
}: {
  folder: DriveFolderData;
  updateProgressCallback?: (progress: number) => void;
  isTeam: boolean;
  abortController?: AbortController
}): Promise<void> {
  const { bridgeUser, bridgePass, encryptionKey } = getEnvironmentConfig(isTeam);

  return downloadFolder(
    folder,
    { bridgeUser, bridgePass, encryptionKey },
    { abortController, updateProgress: updateProgressCallback }
  );
}

async function downloadFolder(
  folder: DriveFolderData,
  environment: { bridgeUser: string, bridgePass: string, encryptionKey: string },
  opts: {
    abortController?: AbortController,
    updateProgress?: (progress: number) => void
  }
) {
  const abortables: Abortable[] = [];
  const { abortController, updateProgress } = opts;
  const { bridgeUser, bridgePass, encryptionKey } = environment;
  const { tree, folderDecryptedNames, fileDecryptedNames, size } = await folderService.fetchFolderTree(folder.id);
  const pendingFolders: { path: string, data: FolderTree }[] = [{ path: '', data: tree }];

  const zip = new FlatFolderZip(folder.name, {
    abortController: opts.abortController,
    progress: (loadedBytes) => updateProgress?.(loadedBytes / size)
  });

  while (pendingFolders.length > 0 && !abortController?.signal.aborted) {
    const currentFolder = pendingFolders.shift() as { path: string, data: FolderTree };
    const folderPath = currentFolder.path + (currentFolder.path === '' ? '' : '/') + folderDecryptedNames[currentFolder.data.id];

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
          user: bridgeUser
        },
        mnemonic: encryptionKey,
        options: {
          notifyProgress: () => null,
          abortController: opts.abortController
        }
      });

      zip.addFile(folderPath + '/' + displayFilename, await fileStreamPromise);
    }

    pendingFolders.push(...folders.map(tree => ({ path: folderPath, data: tree })));
  }

  if (abortController?.signal.aborted) {
    throw new Error('Download cancelled');
  }

  return zip.close();
}
