import { SharedFolders } from '@internxt/sdk/dist/drive/share/types';
import { Iterator } from 'app/core/collections';
import { FlatFolderZip } from 'services/zip.service';
import { DriveFolderData } from '../types';

async function addAllFoldersToZip(
  currentAbsolutePath: string,
  iterator: Iterator<DriveFolderData>,
  zip: FlatFolderZip,
  onFolderAdded?: () => void,
): Promise<DriveFolderData[]> {
  const path = currentAbsolutePath;
  const allFolders: DriveFolderData[] = [];

  const addFolderToZip = (folder: DriveFolderData) => {
    zip.addFolder(path + '/' + (folder.plainName ?? folder.name));
  };

  let pack;
  let moreFolders = true;

  while (moreFolders) {
    pack = await iterator.next();
    const folders = pack.value;
    moreFolders = !pack.done;
    allFolders.push(...folders);

    for (const folder of folders) {
      addFolderToZip(folder);
      if (onFolderAdded) {
        onFolderAdded();
      }
    }
  }

  return allFolders;
}

async function addAllSharedFoldersToZip(
  currentAbsolutePath: string,
  iterator: Iterator<SharedFolders>,
  zip: FlatFolderZip,
  onFolderAdded?: () => void,
): Promise<{ folders: SharedFolders[]; token: string }> {
  const path = currentAbsolutePath;
  const allFolders: SharedFolders[] = [];

  const addFolderToZip = (folder: DriveFolderData) => {
    zip.addFolder(path + '/' + folder.name);
  };

  let pack;
  let moreFolders = true;

  while (moreFolders) {
    pack = await iterator.next();
    const folders = pack.value;
    moreFolders = !pack.done;
    allFolders.push(...folders);

    for (const folder of folders) {
      addFolderToZip(folder);
      if (onFolderAdded) {
        onFolderAdded();
      }
    }
  }

  return { folders: allFolders, token: pack.token ?? '' };
}

export { addAllFoldersToZip, addAllSharedFoldersToZip };
