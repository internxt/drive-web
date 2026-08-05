import { DriveFileData } from 'app/drive/types';
import fileExtensionService from 'app/drive/services/file-extension.service';
import { FileExtensionGroup, fileExtensionPreviewableGroups } from 'app/drive/types/file-types';

export const extensionsList = fileExtensionService.computeExtensionsLists(fileExtensionPreviewableGroups);

const PORTRAIT_PAGE_HORIZONTAL_MARGIN = 32;

export const PORTRAIT_VIEWER_PADDING_CLASS = 'portrait:px-4';

export function getPortraitFitWidth(): number | undefined {
  return window.innerWidth < window.innerHeight ? window.innerWidth - PORTRAIT_PAGE_HORIZONTAL_MARGIN : undefined;
}

export function getIsTypeAllowedAndFileExtensionGroupValues(file: Pick<DriveFileData, 'type'>) {
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
