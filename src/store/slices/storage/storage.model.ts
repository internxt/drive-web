import { FileViewMode, OrderDirection, StorageItemList } from '../../../models/enums';
import { DriveItemData, FolderPath, OrderSettings } from '../../../models/interfaces';

export interface StorageFilters {
  text: string;
}

export interface StorageState {
  isLoading: boolean;
  isDeletingItems: boolean;
  lists: { [key in StorageItemList]: DriveItemData[] };
  isLoadingRecents: boolean;
  filters: StorageFilters;
  order: OrderSettings;
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

export function orderFactory(by: string, direction: OrderDirection): OrderSettings {
  return {
    by,
    direction,
  };
}
