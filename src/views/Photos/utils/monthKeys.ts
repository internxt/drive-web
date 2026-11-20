import { MonthKey, PhotoMonth } from '../types';

export const getUniqueMonthKeysNewestFirst = (months: PhotoMonth[]): MonthKey[] =>
  [...new Set(months.map((month) => month.key))].sort((month, otherMonth) => otherMonth.localeCompare(month));

/**
 * Identifies the months a filter shows: the gallery is loaded again whenever it changes.
 */
export const getShownMonthsKey = (months: PhotoMonth[]): string => months.map((month) => month.folderUuid).join();
