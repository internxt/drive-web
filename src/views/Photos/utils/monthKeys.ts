import { MonthKey, PhotoMonth } from '../types';

export const getUniqueMonthKeysNewestFirst = (months: PhotoMonth[]): MonthKey[] =>
  [...new Set(months.map((month) => month.key))].sort((month, otherMonth) => otherMonth.localeCompare(month));
