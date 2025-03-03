import { ShareLink } from '@internxt/sdk/dist/drive/share/types';
import { AdvancedSharedItem, SharedNamePath } from 'app/share/types';
import { OrderDirection, OrderSettings } from '../../../core/types';
import { DriveItemData, FileViewMode, FolderPath, FolderPathDialog } from '../../../drive/types';
import { IRoot } from './types';

export interface StorageFilters {
  text: string;
}

export interface StorageState {
  loadingFolders: Record<number, boolean>;
  forceLoading: boolean;
  isDeletingItems: boolean;
  levels: Record<string, DriveItemData[]>;
  moveDialogLevels: Record<number, DriveItemData[]>;
  levelsFoldersLength: Record<number, number>;
  levelsFilesLength: Record<number, number>;
  hasMoreDriveFolders: Record<number, boolean>;
  hasMoreDriveFiles: Record<number, boolean>;
  recents: DriveItemData[];
  isLoadingRecents: boolean;
  isLoadingDeleted: boolean;
  filters: StorageFilters;
  order: OrderSettings;
  selectedItems: DriveItemData[];
  itemToShare: {
    share?: ShareLink;
    sharings?: { type: string; id: string }[];
    item: DriveItemData | (AdvancedSharedItem & { user: { email: string } });
  } | null;
  itemsToDelete: DriveItemData[];
  itemsToMove: DriveItemData[];
  itemToRename: DriveItemData | null;
  itemsOnTrash: DriveItemData[];
  folderOnTrashLength: number;
  filesOnTrashLength: number;
  filesToRename: (File | DriveItemData)[];
  driveFilesToRename: DriveItemData[];
  foldersToRename: (DriveItemData | IRoot)[];
  driveFoldersToRename: DriveItemData[];
  moveDestinationFolderId: string | null;
  viewMode: FileViewMode;
  namePath: FolderPath[];
  folderPathDialog: FolderPathDialog[];
  driveItemsSort: string;
  driveItemsOrder: string;
  sharedNamePath: SharedNamePath[];
  currentPath: FolderPath;
}

export interface StorageSetFiltersPayload {
  text?: string;
}

export function filtersFactory(): StorageFilters {
  return {
    text: '',
  };
}

export function orderFactory(by: string, direction: OrderDirection): OrderSettings {
  return {
    by,
    direction,
  };
}
