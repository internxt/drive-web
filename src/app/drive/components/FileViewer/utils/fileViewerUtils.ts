import { DriveFileData } from '../../../../drive/types';
import fileExtensionService from '../../../../drive/services/file-extension.service';
import { FileExtensionGroup, fileExtensionPreviewableGroups } from '../../../../drive/types/file-types';

export const extensionsList = fileExtensionService.computeExtensionsLists(fileExtensionPreviewableGroups);

export function getIsTypeAllowedAndFileExtensionGroupValues(file: DriveFileData) {
  for (const [groupKey, extensions] of Object.entries(extensionsList)) {
    const isTypeAllowed = extensions.includes(file?.type ? String(file.type).toLowerCase() : '');

    if (isTypeAllowed) {
      return {
        isTypeAllowed,
        fileExtensionGroup: FileExtensionGroup[groupKey],
      };
    }
  }
}
