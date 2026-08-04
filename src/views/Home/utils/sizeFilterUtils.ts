import { SearchFilters } from '../services';

export type SearchSizePreset = 'any' | 'less5mb' | 'less100mb' | 'less1gb' | 'more1gb' | 'custom';

export type SizeUnit = 'B' | 'KB' | 'MB' | 'GB' | 'TB';

export interface CustomSizeRange {
  biggerThan?: number;
  biggerThanUnit: SizeUnit;
  smallerThan?: number;
  smallerThanUnit: SizeUnit;
}

export const emptyCustomSizeRange: CustomSizeRange = { biggerThanUnit: 'KB', smallerThanUnit: 'GB' };

export const UNIT_BYTES: Record<SizeUnit, number> = {
  B: 1,
  KB: 1024,
  MB: 1024 ** 2,
  GB: 1024 ** 3,
  TB: 1024 ** 4,
};

export const SIZE_UNIT_ITEMS: { id: SizeUnit; labelKey: string }[] = [
  { id: 'B', labelKey: 'bytes' },
  { id: 'KB', labelKey: 'kilobytes' },
  { id: 'MB', labelKey: 'megabytes' },
  { id: 'GB', labelKey: 'gigabytes' },
  { id: 'TB', labelKey: 'terabytes' },
];

export const SIZE_PRESET_ITEMS: { id: Exclude<SearchSizePreset, 'any'>; labelKey: string }[] = [
  { id: 'less5mb', labelKey: 'less5mb' },
  { id: 'less100mb', labelKey: 'less100mb' },
  { id: 'less1gb', labelKey: 'less1gb' },
  { id: 'more1gb', labelKey: 'more1gb' },
  { id: 'custom', labelKey: 'customRange' },
];

export const sizePresetToRange = (
  preset: SearchSizePreset,
  custom: CustomSizeRange,
): Pick<SearchFilters, 'minSize' | 'maxSize'> => {
  switch (preset) {
    case 'less5mb':
      return { minSize: undefined, maxSize: 5 * UNIT_BYTES.MB };
    case 'less100mb':
      return { minSize: undefined, maxSize: 100 * UNIT_BYTES.MB };
    case 'less1gb':
      return { minSize: undefined, maxSize: UNIT_BYTES.GB };
    case 'more1gb':
      return { minSize: UNIT_BYTES.GB, maxSize: undefined };
    case 'custom':
      return {
        minSize: custom.biggerThan !== undefined ? custom.biggerThan * UNIT_BYTES[custom.biggerThanUnit] : undefined,
        maxSize: custom.smallerThan !== undefined ? custom.smallerThan * UNIT_BYTES[custom.smallerThanUnit] : undefined,
      };
    default:
      return { minSize: undefined, maxSize: undefined };
  }
};

export const isSizeFilterActive = (preset: SearchSizePreset, custom: CustomSizeRange): boolean => {
  const { minSize, maxSize } = sizePresetToRange(preset, custom);
  return minSize !== undefined || maxSize !== undefined;
};

export const changeCustomSize = (current: CustomSizeRange, changes: Partial<CustomSizeRange>): CustomSizeRange => {
  const next = { ...current, ...changes };
  const { minSize, maxSize } = sizePresetToRange('custom', next);
  if (minSize !== undefined && maxSize !== undefined && maxSize < minSize) return current;
  return next;
};
