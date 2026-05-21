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

export const getDriveItemData = (overrides: Partial<DriveItemData> = {}): DriveItemData => ({
  id: 1,
  uuid: 'item-uuid-1',
  name: 'My Item',
  plain_name: 'My Item',
  plainName: 'My Item',
  isFolder: false,
  size: 1024,
  sizeComputed: false,
  bucket: 'bucket-id',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  deleted: false,
  deletedAt: null,
  encrypt_version: '03-aes',
  fileId: 'file-id-1',
  folderId: 10,
  folder_id: 10,
  folderUuid: 'parent-uuid',
  parentId: 10,
  parent_id: 10,
  parentUuid: 'parent-uuid',
  type: 'pdf',
  color: null,
  icon: null,
  iconId: null,
  icon_id: null,
  userId: 100,
  user_id: 100,
  status: 'EXISTS',
  thumbnails: [],
  currentThumbnail: null,
  created_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
});
