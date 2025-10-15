export enum DatabaseProvider {
  IndexedDB = 'indexed-db',
}

export enum DatabaseCollection {
  Levels = 'levels',
  MoveDialogLevels = 'move_levels',
  LevelsBlobs = 'levels_blobs',
  LRU_cache = 'lru_cache',
  Account_settings = 'account_settings',
  UploadItemStatus = 'upload_item_status',
  WorkspacesAvatarBlobs = 'workspaces_avatar_blobs',
}

export enum LRUCacheTypes {
  LevelsBlobs = 'levels_blobs',
  LevelsBlobsPreview = 'levels_blobs_preview',
}
