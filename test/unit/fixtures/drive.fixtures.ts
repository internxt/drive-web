import { DriveItemData } from 'app/drive/types';

export const buildDriveItemData = (overrides: Partial<DriveItemData> = {}): DriveItemData =>
  ({
    id: 1,
    uuid: 'item-uuid',
    name: 'document',
    type: 'pdf',
    isFolder: false,
    size: 1024,
    ...overrides,
  }) as DriveItemData;
