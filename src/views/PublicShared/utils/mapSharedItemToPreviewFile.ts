import { DriveFileData } from 'app/drive/types';
import { AdvancedSharedItem } from 'app/share/types';

const mapSharedItemToPreviewFile = (item: AdvancedSharedItem): DriveFileData => ({
  id: item.id,
  uuid: item.uuid,
  bucket: item.bucket ?? '',
  fileId: item.fileId ?? null,
  name: item.name,
  plainName: item.plainName,
  plain_name: item.plainName ?? null,
  type: item.type,
  size: Number(item.size),
  folderId: item.folderId,
  folder_id: item.folderId,
  folderUuid: item.folderUuid,
  createdAt: item.createdAt,
  created_at: item.createdAt,
  updatedAt: item.updatedAt,
  deleted: item.deleted,
  deletedAt: null,
  encrypt_version: item.encryptVersion,
  status: item.status,
  thumbnails: item.thumbnails ?? [],
  currentThumbnail: null,
});

export default mapSharedItemToPreviewFile;
