import { ShareLink } from '@internxt/sdk/dist/drive/share/types';
import { OrderDirection, OrderSettings } from '../../../core/types';
import { DriveItemData, FileViewMode, FolderPath, FolderPathDialog } from '../../../drive/types';

export interface StorageFilters {
  text: string;
}

export interface StorageState {
  loadingFolders: Record<number, boolean>;
  isDeletingItems: boolean;
  levels: Record<number, DriveItemData[]>;
  recents: DriveItemData[];
  isLoadingRecents: boolean;
  isLoadingDeleted: boolean;
  filters: StorageFilters;
  order: OrderSettings;
  selectedItems: DriveItemData[];
  itemToShare: { share?: ShareLink; item: DriveItemData } | null;
  itemsToDelete: DriveItemData[];
  itemsToMove: DriveItemData[];
  itemsOnTrash: DriveItemData[];
  viewMode: FileViewMode;
  namePath: FolderPath[];
  folderPathDialog: FolderPathDialog[];
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
