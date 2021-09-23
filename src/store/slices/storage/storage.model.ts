import { FileViewMode } from '../../../models/enums';
import { DriveItemData, FolderPath } from '../../../models/interfaces';

export interface StorageFilters {
  text: string;
}

export interface StorageState {
  loadingFolders: Record<number, boolean>;
  isDeletingItems: boolean;
  levels: Record<number, DriveItemData[]>;
  recents: DriveItemData[];
  isLoadingRecents: boolean;
  filters: StorageFilters;
  selectedItems: DriveItemData[];
  itemToShare: DriveItemData | null;
  itemsToDelete: DriveItemData[];
  infoItem: DriveItemData | null;
  viewMode: FileViewMode;
  namePath: FolderPath[];
}

export interface StorageSetFiltersPayload {
  text?: string;
}

export function filtersFactory(): StorageFilters {
  return {
    text: '',
  };
}
