import { DriveItemData, ExceededFile, ReachedFileSizeLimitDialogInfo } from 'app/drive/types';

export const getExceededFile = (overrides: Partial<ExceededFile> = {}): ExceededFile => ({
  name: 'large-document.pdf',
  size: 1073741824,
  ...overrides,
});

export const getReachedFileSizeLimitDialogInfo = (
  overrides: Partial<ReachedFileSizeLimitDialogInfo> = {},
): ReachedFileSizeLimitDialogInfo => ({
  exceededFiles: [getExceededFile()],
  ...overrides,
});

export const getDriveItemData = (overrides: Partial<DriveItemData> = {}): DriveItemData =>
  ({
    id: 1,
    uuid: 'item-uuid',
    name: 'document',
    type: 'pdf',
    isFolder: false,
    size: 1024,
    ...overrides,
  }) as DriveItemData;
