import { DriveItemData } from '../../models/interfaces';

export function checkFileNameExists(items: DriveItemData[], filename: string, type: string): [boolean, number, string] {
  const FILENAME_INCREMENT_REGEX = /( \([0-9]+\))$/i;
  const INCREMENT_INDEX_REGEX = /\(([^)]+)\)/;

  const cleanFilename = filename.replace(FILENAME_INCREMENT_REGEX, '');

  const infoFilenames: { name: string, cleanName: string; type: string; incrementIndex: number; }[] = items
    .map(item => {
      const cleanName = item.name.replace(FILENAME_INCREMENT_REGEX, '');
      const incrementString = item.name.match(FILENAME_INCREMENT_REGEX)?.pop()?.match(INCREMENT_INDEX_REGEX)?.pop();
      const incrementIndex = parseInt(incrementString || '0');

      return {
        name: item.name,
        cleanName,
        type: item.type,
        incrementIndex
      };
    })
    .filter(item => item.cleanName === cleanFilename && item.type === type)
    .sort((a, b) => b.incrementIndex - a.incrementIndex);

  const filenameExists = !!infoFilenames.length;

  if (filenameExists){
    const index = infoFilenames[0].incrementIndex + 1;

    return [true, index, getNextNewName(cleanFilename, index)];
  } else {
    return [false, 0, filename];
  }
}

export function getNextNewName(filename: string, i: number): string {
  return `${filename} (${i})`;
}

export function getItemFullName(itemName: string, itemType?: string): string {
  return `${itemName}${itemType ? ('.' + itemType) : ''}`;
}

const nameService = {
  checkFileNameExists,
  getNextNewName,
  getItemFullName
};

export default nameService;