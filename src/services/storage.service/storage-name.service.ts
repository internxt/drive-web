import { DriveItemData } from '../../models/interfaces';

export function checkFileNameExists(currentCommanderItems: any[], fileName: string, type): boolean {
  return currentCommanderItems.some(
    (item) => !item.isFolder && item.name === fileName && item.type === type
  );
}

export function getNextNewName(originalName: string, i: number): string {
  return `${originalName} (${i})`;
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