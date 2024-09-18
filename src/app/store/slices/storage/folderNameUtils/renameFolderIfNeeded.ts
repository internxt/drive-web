function getNextNewName(filename: string, i: number): string {
  return `${filename} (${i})`;
}

export default function renameFolderIfNeeded(items: { name: string }[], folderName: string): [boolean, number, string] {
  const FOLDER_INCREMENT_REGEX = /( \([0-9]+\))$/i;
  const INCREMENT_INDEX_REGEX = /\(([^)]+)\)/;

  const cleanFilename = folderName.replace(FOLDER_INCREMENT_REGEX, '');

  const infoFoldernames: { name: string; cleanName: string; incrementIndex: number }[] = items
    .map((item) => {
      const cleanName = item.name.replace(FOLDER_INCREMENT_REGEX, '');
      const incrementString = item.name.match(FOLDER_INCREMENT_REGEX)?.pop()?.match(INCREMENT_INDEX_REGEX)?.pop();
      const incrementIndex = parseInt(incrementString || '0');

      return {
        name: item.name,
        cleanName,
        incrementIndex,
      };
    })
    .filter((item) => item.cleanName === cleanFilename)
    .sort((a, b) => b.incrementIndex - a.incrementIndex);

  const filenameExists = !!infoFoldernames.length;

  if (filenameExists) {
    const index = infoFoldernames[0].incrementIndex + 1;

    return [true, index, getNextNewName(cleanFilename, index)];
  } else {
    return [false, 0, folderName];
  }
}
