import fileExtensionGroups, { FileExtensionGroup } from '../types/file-types';

function computeExtensionsLists(
  filter: { [key in FileExtensionGroup]?: string[] } = {},
): Record<FileExtensionGroup, string[]> {
  const extensionsLists: Partial<Record<FileExtensionGroup, string[]>> = {};

  Object.values(FileExtensionGroup)
    .filter((groupId) => isNaN(Number(groupId)))
    .forEach((groupId: string | FileExtensionGroup) => {
      extensionsLists[groupId as FileExtensionGroup] = computeExtensionsList(
        FileExtensionGroup[groupId],
        filter[FileExtensionGroup[groupId]],
      );
    });

  return extensionsLists as Record<FileExtensionGroup, string[]>;
}

function computeExtensionsList(groupId: FileExtensionGroup, filter: string[] = []): string[] {
  return Object.values(fileExtensionGroups[groupId])
    .reduce((acc, formatExtensions) => acc.concat(formatExtensions), [])
    .filter((extension) => !filter || filter.includes(extension));
}

const fileExtensionService = {
  computeExtensionsLists,
};

export default fileExtensionService;
