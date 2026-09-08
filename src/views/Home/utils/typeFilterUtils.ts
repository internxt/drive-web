import type { SearchFileCategory } from '../services';

export const TYPE_FILTER_ITEMS: { id: SearchFileCategory; labelKey: string; extension?: string }[] = [
  { id: 'folder', labelKey: 'folder' },
  { id: 'pdf', labelKey: 'pdf', extension: 'pdf' },
  { id: 'image', labelKey: 'image', extension: 'jpg' },
  { id: 'video', labelKey: 'video', extension: 'mp4' },
  { id: 'audio', labelKey: 'audio', extension: 'mp3' },
  { id: 'zip', labelKey: 'zip', extension: 'zip' },
  { id: 'word', labelKey: 'document', extension: 'docx' },
  { id: 'ppt', labelKey: 'powerpoint', extension: 'pptx' },
  { id: 'xls', labelKey: 'excel', extension: 'xlsx' },
  { id: 'txt', labelKey: 'text', extension: 'txt' },
  { id: 'code', labelKey: 'code', extension: 'js' },
  { id: 'csv', labelKey: 'csv', extension: 'csv' },
  { id: 'xml', labelKey: 'xml', extension: 'xml' },
  { id: 'figma', labelKey: 'figma', extension: 'fig' },
];

export const ALL_TYPE_CATEGORIES: SearchFileCategory[] = TYPE_FILTER_ITEMS.map(({ id }) => id);

export const toggleTypeCategory = (
  selected: SearchFileCategory[],
  category: SearchFileCategory,
): SearchFileCategory[] =>
  selected.includes(category) ? selected.filter((current) => current !== category) : [...selected, category];

export const areAllTypeCategoriesSelected = (selected: SearchFileCategory[]): boolean =>
  selected.length === ALL_TYPE_CATEGORIES.length;

export const toggleAllTypeCategories = (selected: SearchFileCategory[]): SearchFileCategory[] =>
  areAllTypeCategoriesSelected(selected) ? [] : [...ALL_TYPE_CATEGORIES];

export const isTypeFilterActive = (selected: SearchFileCategory[]): boolean =>
  selected.length > 0 && !areAllTypeCategoriesSelected(selected);
