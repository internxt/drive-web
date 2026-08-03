import { GlobalSearchOptions, SearchResult } from '@internxt/sdk/dist/drive/storage/types';
import { SdkFactory } from 'app/core/factory/sdk';
import fileExtensionGroups, { FileExtensionGroup } from 'app/drive/types/file-types';
import { ALL_TYPE_CATEGORIES, isTypeFilterActive } from '../utils/typeFilterUtils';

export type SearchFileCategory = 'folder' | Lowercase<Exclude<keyof typeof FileExtensionGroup, 'Default'>>;

export interface SearchFilters {
  type: SearchFileCategory[];
  minSize?: number;
  maxSize?: number;
  modifiedAfter?: string;
  modifiedBefore?: string;
}

export const defaultSearchFilters: SearchFilters = { type: [...ALL_TYPE_CATEGORIES] };

const CATEGORY_EXTENSION_GROUPS: Record<Exclude<SearchFileCategory, 'folder'>, FileExtensionGroup> = {
  audio: FileExtensionGroup.Audio,
  code: FileExtensionGroup.Code,
  csv: FileExtensionGroup.Csv,
  figma: FileExtensionGroup.Figma,
  image: FileExtensionGroup.Image,
  pdf: FileExtensionGroup.Pdf,
  ppt: FileExtensionGroup.Ppt,
  txt: FileExtensionGroup.Txt,
  video: FileExtensionGroup.Video,
  word: FileExtensionGroup.Word,
  xls: FileExtensionGroup.Xls,
  xml: FileExtensionGroup.Xml,
  zip: FileExtensionGroup.Zip,
};

const resolveTypeFilters = (categories: SearchFileCategory[]): string[] => {
  const types = categories.flatMap((category) =>
    category === 'folder' ? ['folder'] : Object.values(fileExtensionGroups[CATEGORY_EXTENSION_GROUPS[category]]).flat(),
  );
  return [...new Set(types)];
};

const buildSearchOptions = (filters: SearchFilters): GlobalSearchOptions => {
  const options: GlobalSearchOptions = {};
  if (isTypeFilterActive(filters.type)) options.type = resolveTypeFilters(filters.type);
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
