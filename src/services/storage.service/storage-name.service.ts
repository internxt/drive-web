import { DriveItemData } from '../../models/interfaces';

export function checkFileNameExists(items: DriveItemData[], filename: string, type: string): [boolean, number, string] {
  const FILENAME_INCREMENT_REGEX = /( \([0-9]+\))$/i;
  const INCREMENT_INDEX_REGEX = /\(([^)]+)\)/;
  const infoFilenames: { cleanName: string; type: string; incrementIndex: number; }[] = items
    .map(item => {
      const cleanName = item.name.replace(FILENAME_INCREMENT_REGEX, '');
      const incrementString = item.name.match(FILENAME_INCREMENT_REGEX)?.pop()?.match(INCREMENT_INDEX_REGEX)?.pop();
      const incrementIndex = parseInt(incrementString || '0');

      return {
        cleanName,
        type: item.type,
        incrementIndex
      };
    })
    .filter(item => item.cleanName === filename && item.type === type)
    .sort((a, b) => b.incrementIndex - a.incrementIndex);
  const filenameExists = infoFilenames.length > 0;
  const filenameIndex = infoFilenames[0] ? (infoFilenames[0].incrementIndex + 1) : 0;
  const finalFilename = filenameIndex > 0 ? getNextNewName(filename, filenameIndex) : filename;

  return [filenameExists, filenameIndex, finalFilename];
}

export function getNextNewName(filename: string, i: number): string {
  return `${filename} (${i})`;
}

export function getNewFileName(name: string, type: string, currentCommanderItems: any[]): string {
  let exists = true;

  let i = 1;

  let finalName;
  const currentFiles = currentCommanderItems.filter((item) => !item.isFolder);

  while (exists) {
    const newName = getNextNewName(name, i);

    exists = currentFiles.find((file) => file.name === newName && file.type === type);
    finalName = newName;
    i += 1;
  }

  return finalName;
}

export function getNewFolderName(name: string, currentCommanderItems: any[]): string {
  let exists = false;

  let i = 1;
  const currentFolder = currentCommanderItems.filter((item) => item.isFolder);

  let finalName = name;

  const foldName = name.replace(/ /g, '');

  currentFolder.forEach((folder) => {
    const fold = folder.name.replace(/ /g, '');

    if (foldName === fold) {
      exists = true;
    } else {
      exists = false;
      finalName = name;
    }
  });

  while (exists) {
    const newName = getNextNewName(name, i);

    exists = currentFolder.find((folder) => folder.name === newName);
    i += 1;
    finalName = newName;
  }

  return finalName;
}

export function getItemFullName(itemName: string, itemType?: string): string {
  return `${itemName}${itemType ? ('.' + itemType) : ''}`;
}

const nameService = {
  checkFileNameExists,
  getNewFileName,
  getNewFolderName,
  getNextNewName,
  getItemFullName
};

export default nameService;