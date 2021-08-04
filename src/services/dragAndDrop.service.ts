/* eslint-disable no-loop-func */
import { MAX_ALLOWED_UPLOAD_SIZE } from '../lib/constants';

export async function getAllItems(dataTransfer) {
  const entries = await getEntries(dataTransfer.items);

  console.log(entries);
  const levels: Array<[]> = [];

  //There is always a root ?
  // levels.push();

  entries.directoryEntryList.map(directory => {
    const level = directory.fullPath.split('/').length - 2;

    directory.childrenFiles = entries.childrenIndex[directory.fullPath];
    // directory.childrenFolders =
    // console.log(level);

    if (levels[level]) {
      // insert level
      levels[level].push(directory);
    } else {
      // create level
      levels.push([directory]);
    }
  });
  console.log(levels);

  // entries.levels = levels;

  const items = {
    numberOfItems: entries.entryList.length,
    rootList: levels[0],
    files: entries.childrenIndex['']
  };

  // console.log(items);
  return items;// entries;
}

function getParentName(fullPath) {
  // fullPath of a file
  const namePath = fullPath.split('/');
  const parentName = namePath[namePath.length - 2];

  return parentName;
}

function parentFullPath(filePath) {
  const arrayPath = filePath.split('/');

  arrayPath.pop();
  const parentPath = arrayPath.join('/');

  return parentPath;
}

async function getEntries(dataTransferItemList: DataTransferItemList) {
  const entryList: DataTransferItem[] = [];
  const fileEntryList: File[] = [];
  const directoryEntryList: DataTransferItem[] = [];
  let totalSize = 0;
  const filesAboveMaxSize = [];
  const childrenIndex = {};

  // Use BFS to traverse entire directory/file structure
  const queue: unknown[] = [];

  // dataTransferItemList is not iterable i.e. no forEach
  for (let i = 0; i < dataTransferItemList.length; i++) {
    queue.push(dataTransferItemList[i].webkitGetAsEntry());
  }
  while (queue.length > 0) {
    const entry = queue.shift();

    if (entry.isFile) {
      // eslint-disable-next-line no-loop-func
      const indexKey = parentFullPath(entry.fullPath);

      if (!childrenIndex[indexKey]) {
        childrenIndex[indexKey] = [];
      }

      await getFile(entry).then(fileEntry => {
        fileEntryList.push(fileEntry);
        totalSize += fileEntry.size;
        childrenIndex[indexKey].push(fileEntry);
        if (fileEntry.size >= MAX_ALLOWED_UPLOAD_SIZE) {
          filesAboveMaxSize.push(entry.name);
        }
      });
      entryList.push(entry);
    } else if (entry.isDirectory) {
      // entry.children = [];
      entryList.push(entry);
      directoryEntryList.push(entry);
      const reader = entry.createReader();
      const directChildren = await readAllDirectoryEntries(reader);

      entry.childrenFiles = [];
      entry.childrenFolders = [];

      for (const childEntry of directChildren) {
        // TODO
        if (childEntry.isFile) {
          entry.childrenFiles.push(childEntry);
        } else {
          entry.childrenFolders.push(childEntry);
        }
      }

      queue.push(...directChildren);
    }
  }
  return { entryList, fileEntryList, totalSize, filesAboveMaxSize, directoryEntryList, childrenIndex };
}

// Drop handler function to get all files
export async function getAllFileEntries(dataTransferItemList: DataTransferItemList) {
  const fileEntries = [];
  // Use BFS to traverse entire directory/file structure
  const queue: unknown[] = [];

  // dataTransferItemList is not iterable i.e. no forEach
  for (let i = 0; i < dataTransferItemList.length; i++) {
    queue.push(dataTransferItemList[i].webkitGetAsEntry());
  }
  while (queue.length > 0) {
    const entry = queue.shift();

    if (entry.isFile) {
      fileEntries.push(entry);
    } else if (entry.isDirectory) {
      const reader = entry.createReader();

      queue.push(...await readAllDirectoryEntries(reader));
    }
  }

  return fileEntries;
}

// Get all the entries (files or sub-directories) in a directory by calling readEntries until it returns empty array
async function readAllDirectoryEntries(directoryReader, level = 0) {
  const entries = [];
  let readEntries = await readEntriesPromise(directoryReader);

  while (readEntries.length > 0) {
    entries.push(...readEntries);
    readEntries = await readEntriesPromise(directoryReader);
  }
  return entries;
}

// Wrap readEntries in a promise to make working with readEntries easier
async function readEntriesPromise(directoryReader) {
  try {
    return await new Promise((resolve, reject) => {
      directoryReader.readEntries(resolve, reject);
    });
  } catch (err) {
    console.log(err);
  }
}

// get File from FileEntry
async function getFile(fileEntry) {
  try {
    return await new Promise((resolve, reject) => fileEntry.file(resolve, reject));
  } catch (err) {
    console.log(err);
  }
}
