import dayjs, { Dayjs } from 'dayjs';
import { SearchFilters } from '../services';

export type SearchDatePreset = 'any' | 'today' | 'last7days' | 'last30days' | 'thisYear' | 'lastYear' | 'specific';

export interface SpecificDateRange {
  after?: Dayjs;
  before?: Dayjs;
}

export const DATE_PRESET_ITEMS: { id: Exclude<SearchDatePreset, 'any'>; labelKey: string }[] = [
  { id: 'today', labelKey: 'today' },
  { id: 'last7days', labelKey: 'last7days' },
  { id: 'last30days', labelKey: 'last30days' },
  { id: 'thisYear', labelKey: 'thisYear' },
  { id: 'lastYear', labelKey: 'lastYear' },
  { id: 'specific', labelKey: 'specificDate' },
];

export const datePresetToRange = (
  preset: SearchDatePreset,
  specific: SpecificDateRange,
): Pick<SearchFilters, 'modifiedAfter' | 'modifiedBefore'> => {
  switch (preset) {
    case 'today':
      return { modifiedAfter: dayjs().startOf('day').toISOString(), modifiedBefore: undefined };
    case 'last7days':
      return { modifiedAfter: dayjs().subtract(7, 'day').startOf('day').toISOString(), modifiedBefore: undefined };
    case 'last30days':
      return { modifiedAfter: dayjs().subtract(30, 'day').startOf('day').toISOString(), modifiedBefore: undefined };
    case 'thisYear':
      return { modifiedAfter: dayjs().startOf('year').toISOString(), modifiedBefore: undefined };
    case 'lastYear': {
      const lastYear = dayjs().subtract(1, 'year');
      return {
        modifiedAfter: lastYear.startOf('year').toISOString(),
        modifiedBefore: lastYear.endOf('year').toISOString(),
      };
    }
    case 'specific':
      return {
        modifiedAfter: specific.after?.startOf('day').toISOString(),
        modifiedBefore: specific.before?.endOf('day').toISOString(),
      };
    default:
      return { modifiedAfter: undefined, modifiedBefore: undefined };
  }
};

export const isDateFilterActive = (preset: SearchDatePreset, specific: SpecificDateRange): boolean => {
  const { modifiedAfter, modifiedBefore } = datePresetToRange(preset, specific);
  return modifiedAfter !== undefined || modifiedBefore !== undefined;
};

export const changeSpecificDate = (
  current: SpecificDateRange,
  field: 'after' | 'before',
  date?: Dayjs,
): SpecificDateRange => {
  if (field === 'before' && date && current.after && date.isBefore(current.after, 'day')) return current;
  if (field === 'after' && date && current.before && date.isAfter(current.before, 'day')) return current;
  return { ...current, [field]: date };
};
