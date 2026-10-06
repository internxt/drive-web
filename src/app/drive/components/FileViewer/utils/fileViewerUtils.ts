import { DriveFileData } from 'app/drive/types';
import fileExtensionService from 'app/drive/services/file-extension.service';
import {
  FileExtensionGroup,
  convertibleImageExtensions,
  fileExtensionPreviewableGroups,
} from 'app/drive/types/file-types';
import { HALF_A_GIGABYTE_IN_BYTES } from 'services/media.service';

export const extensionsList = fileExtensionService.computeExtensionsLists(fileExtensionPreviewableGroups);

const PORTRAIT_PAGE_HORIZONTAL_MARGIN = 32;

export const PORTRAIT_VIEWER_PADDING_CLASS = 'portrait:px-4';

export const MAX_CONVERTIBLE_IMAGE_PREVIEW_BYTES = 200 * 1024 * 1024;

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

const isConvertibleImage = (type: DriveFileData['type']): boolean =>
  convertibleImageExtensions.includes(String(type).toLowerCase());

export const getPreviewSizeLimitBytes = ({ type }: Pick<DriveFileData, 'type'>): number =>
  isConvertibleImage(type) ? MAX_CONVERTIBLE_IMAGE_PREVIEW_BYTES : HALF_A_GIGABYTE_IN_BYTES;

export const isPreviewableBySize = (file: Pick<DriveFileData, 'type' | 'size'>): boolean =>
  file.size < getPreviewSizeLimitBytes(file);
