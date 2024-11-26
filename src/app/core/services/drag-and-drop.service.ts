import { IRoot } from '../../store/slices/storage/types';

interface FileSystemFileEntry extends FileSystemEntry {
  file: (successCallback: (file: File) => void) => void;
}

/**
 *
 * @param items Items that were dragged
 * @params topLevelPath Path where it was dropped at
 * @returns rootList: List of directories that were dropped at top level
 * @returns files: List of files that were dropped at top level
 */
export async function transformDraggedItems(
  items: DataTransferItemList,
  topLevelPath: string,
): Promise<{ rootList: Array<IRoot>; files: Array<File> }> {
  const topLevelFiles: Array<File> = [];
  const topLevelDirectories: Array<FileSystemDirectoryEntry> = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    const entry: FileSystemEntry | null = item.webkitGetAsEntry();

    if (entry) {
      if (entry.isFile) {
        topLevelFiles.push(item.getAsFile() as File);
      } else {
        topLevelDirectories.push(entry as FileSystemDirectoryEntry);
      }
      // Fallback in case webkitGetAsEntry is not supported
    } else {
      topLevelFiles.push(item.getAsFile() as File);
    }
  }

  const rootList = await Promise.all(
    topLevelDirectories.map((directory) => transformEntryToRoot(directory, topLevelPath)),
  );

  return { rootList, files: topLevelFiles };
}

// Transforms FileSystemDirectoryEntry to IRoot type
async function transformEntryToRoot(entry: FileSystemDirectoryEntry, currentPath: string): Promise<IRoot> {
  const entries = await getEntriesFromDirectory(entry);

  const fullPathEdited = `${currentPath}/${entry.name}`;

  const childrenFilesPromises = Promise.all(
    entries
      .filter((entry) => entry.isFile)
      .map((entry: FileSystemEntry) => getFileFromEntry(entry as FileSystemFileEntry)),
  );
  const childrenFoldersPromises = Promise.all(
    entries
      .filter((entry) => entry.isDirectory)
      .map((entry) => transformEntryToRoot(entry as FileSystemDirectoryEntry, fullPathEdited)),
  );

  const [childrenFiles, childrenFolders] = await Promise.all([childrenFilesPromises, childrenFoldersPromises]);

  return {
    name: entry.name,
    childrenFiles,
    childrenFolders,
    folderId: null,
    fullPathEdited,
  };
}

function getEntriesFromDirectory(entry: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    let entries: FileSystemEntry[] = [];
    const reader = entry.createReader();
    function readEntries() {
      reader.readEntries((results: FileSystemEntry[]) => {
        if (results.length) {
          entries = entries.concat(results);
          readEntries();
        } else {
          resolve(entries);
        }
      }, reject);
    }
    readEntries();
  });
}

function getFileFromEntry(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve) => {
    entry.file(resolve);
  });
}
