import { MAX_ALLOWED_UPLOAD_SIZE } from '../lib/constants';

export async function getAllItems(e, parentId = null) {
  e.preventDefault();
  //const entries = await getEntries(e.dataTransfer.items);

  // console.log(entries);
  return getEntries(e.dataTransfer.items); // entries;
}

async function getEntries(dataTransferItemList: DataTransferItemList) {
  const entryList = [];
  const fileEntryList = [];
  const directoryEntryList = [];
  let totalSize = 0;
  const filesAboveMaxSize = [];

  // Use BFS to traverse entire directory/file structure
  const queue : unknown[] = [];

  // dataTransferItemList is not iterable i.e. no forEach
  for (let i = 0; i < dataTransferItemList.length; i++) {
    queue.push(dataTransferItemList[i].webkitGetAsEntry());
  }
  while (queue.length > 0) {
    const entry = queue.shift();

    if (entry.isFile) {
      getFile(entry).then(fileEntry => {
        fileEntryList.push(fileEntry);
        totalSize += fileEntry.size;
        if (fileEntry.size >= MAX_ALLOWED_UPLOAD_SIZE) {
          filesAboveMaxSize.push(entry.name);
        }
      });
      entryList.push(entry);
    } else if (entry.isDirectory) {
      entryList.push(entry);
      directoryEntryList.push(entry);
      const reader = entry.createReader();

      queue.push(...await readAllDirectoryEntries(reader));
    }
  }
  return { entryList, fileEntryList, totalSize, filesAboveMaxSize };
}

// Drop handler function to get all files
export async function getAllFileEntries(dataTransferItemList: DataTransferItemList) {
  const fileEntries = [];
  // Use BFS to traverse entire directory/file structure
  const queue : unknown[] = [];

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
async function readAllDirectoryEntries(directoryReader) {
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
