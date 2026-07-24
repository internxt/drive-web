import { SearchFileCategory } from '@internxt/sdk/dist/drive/storage/types';

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

export const toggleTypeCategory = (
  selected: SearchFileCategory[],
  category: SearchFileCategory,
): SearchFileCategory[] => {
  const next = selected.includes(category)
    ? selected.filter((current) => current !== category)
    : [...selected, category];
  const isEveryCategorySelected = next.length === TYPE_FILTER_ITEMS.length;
  return isEveryCategorySelected ? [] : next;
};
