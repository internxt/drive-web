import { GlobalSearchOptions, SearchFileCategory, SearchResult } from '@internxt/sdk/dist/drive/storage/types';
import { SdkFactory } from 'app/core/factory/sdk';

export interface SearchFilters {
  type: SearchFileCategory[];
  minSize?: number;
  maxSize?: number;
  modifiedAfter?: string;
  modifiedBefore?: string;
}

export const emptySearchFilters: SearchFilters = { type: [] };

const buildSearchOptions = (filters: SearchFilters): GlobalSearchOptions => {
  const options: GlobalSearchOptions = {};
  if (filters.type.length > 0) options.type = filters.type;
  if (filters.minSize !== undefined) options.minSize = filters.minSize;
  if (filters.maxSize !== undefined) options.maxSize = filters.maxSize;
  if (filters.modifiedAfter !== undefined) options.modifiedAfter = filters.modifiedAfter;
  if (filters.modifiedBefore !== undefined) options.modifiedBefore = filters.modifiedBefore;
  return options;
};

export const searchItems = async (
  query: string,
  workspaceId: string | undefined,
  filters: SearchFilters,
): Promise<SearchResult[]> => {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  const [itemsPromise] = storageClient.getGlobalSearchItems(query, workspaceId, buildSearchOptions(filters));
  const items = await itemsPromise;
  return Array.isArray(items) ? items : items.data;
};
