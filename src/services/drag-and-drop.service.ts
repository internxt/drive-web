import { IRoot } from 'app/store/slices/storage/types';

export async function transformDraggedItems(
  items: DataTransferItemList,
): Promise<{ rootList: Array<IRoot>; files: Array<File> }> {
  const topLevelFiles: Array<File> = [];
  const topLevelDirectories: Array<FileSystemDirectoryEntry> = [];

  for (const item of items) {
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

  const rootList = await Promise.all(topLevelDirectories.map((directory) => transformEntryToRoot(directory)));

  return { rootList, files: topLevelFiles };
}

async function transformEntryToRoot(entry: FileSystemDirectoryEntry): Promise<IRoot> {
  const entries = await getEntriesFromDirectory(entry);

  const childrenFilesPromises = Promise.all(
    entries
      .filter((entry) => entry.isFile)
      .map((entry: FileSystemEntry) => getFileFromEntry(entry as FileSystemFileEntry)),
  );
  const childrenFoldersPromises = Promise.all(
    entries
      .filter((entry) => entry.isDirectory)
      .map((entry) => transformEntryToRoot(entry as FileSystemDirectoryEntry)),
  );

  const [childrenFiles, childrenFolders] = await Promise.all([childrenFilesPromises, childrenFoldersPromises]);

  return {
    name: entry.name,
    isFolder: entry.isDirectory,
    childrenFiles,
    childrenFolders,
    folderId: null,
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
  return new Promise((resolve, reject) => {
    entry.file(resolve, reject);
  });
}
