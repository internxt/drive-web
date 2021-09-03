import fileExtensionGroups, { FileExtensionGroup } from '../models/file-types';

function computeExtensionsLists(): Record<FileExtensionGroup, string[]> {
  const extensionsLists: Partial<Record<FileExtensionGroup, string[]>> = {};

  Object.values(FileExtensionGroup)
    .filter((groupId) => isNaN(Number(groupId)))
    .forEach((groupId: string | FileExtensionGroup) => {
      extensionsLists[groupId as FileExtensionGroup] = computeExtensionsList(FileExtensionGroup[groupId]);
    });

  return extensionsLists as Record<FileExtensionGroup, string[]>;
}

function computeExtensionsList(groupId: FileExtensionGroup): string[] {
  return Object.entries(fileExtensionGroups[groupId]).reduce((t, [, formatExtensions]): string[] => {
    return t.concat(formatExtensions);
  }, [] as string[]);
}

const fileExtensionService = {
  computeExtensionsLists,
};

export default fileExtensionService;
