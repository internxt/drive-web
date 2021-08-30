import fileExtensionGroups, { FileExtensionGroup } from '../models/file-types';

function computeExtensionsLists(): FileExtensionGroup {
  const extensionsLists: any = {};

  Object.values(FileExtensionGroup)
    .filter((groupId) => isNaN(Number(groupId)))
    .forEach((groupId: string | FileExtensionGroup) => {
      extensionsLists[groupId as FileExtensionGroup] = computeExtensionsList(FileExtensionGroup[groupId]);
    });

  return extensionsLists;
}

function computeExtensionsList(groupId: FileExtensionGroup): string[] {
  return Object.entries(fileExtensionGroups[groupId]).reduce((t, [formatKey, formatExtensions]): string[] => {
    return t.concat(formatExtensions);
  }, [] as string[]);
}

const fileExtensionService = {
  computeExtensionsLists,
};

export default fileExtensionService;
