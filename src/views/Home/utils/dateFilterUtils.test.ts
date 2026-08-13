import dayjs from 'dayjs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  changeSpecificDate,
  datePresetToRange,
  formatDateInput,
  isDateFilterActive,
  SpecificDateRange,
} from './dateFilterUtils';

describe('datePresetToRange', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-24T12:30:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('When the preset is any, then no bounds are returned', () => {
    expect(datePresetToRange('any', {})).toEqual({ modifiedAfter: undefined, modifiedBefore: undefined });
  });

  test('When the preset is today, then only the start of today is returned', () => {
    expect(datePresetToRange('today', {})).toEqual({
      modifiedAfter: dayjs('2026-07-24').startOf('day').toISOString(),
      modifiedBefore: undefined,
    });
  });

  test('When the preset is last7days, then the range starts 7 days ago', () => {
    expect(datePresetToRange('last7days', {}).modifiedAfter).toBe(dayjs('2026-07-17').startOf('day').toISOString());
  });

  test('When the preset is last30days, then the range starts 30 days ago', () => {
    expect(datePresetToRange('last30days', {}).modifiedAfter).toBe(dayjs('2026-06-24').startOf('day').toISOString());
  });

  test('When the preset is thisYear, then the range starts at the beginning of the current year', () => {
    expect(datePresetToRange('thisYear', {})).toEqual({
      modifiedAfter: dayjs('2026-01-01').startOf('year').toISOString(),
      modifiedBefore: undefined,
    });
  });

  test('When the preset is lastYear, then the previous year is returned as a closed range', () => {
    expect(datePresetToRange('lastYear', {})).toEqual({
      modifiedAfter: dayjs('2025-01-01').startOf('year').toISOString(),
      modifiedBefore: dayjs('2025-12-31').endOf('year').toISOString(),
    });
  });

  test('When the preset is specific with both dates, then a closed range over full days is returned', () => {
    const specific: SpecificDateRange = { after: dayjs('2026-07-01'), before: dayjs('2026-07-15') };

    expect(datePresetToRange('specific', specific)).toEqual({
      modifiedAfter: dayjs('2026-07-01').startOf('day').toISOString(),
      modifiedBefore: dayjs('2026-07-15').endOf('day').toISOString(),
    });
  });

  test('When the preset is specific with only one date, then an open range is returned', () => {
    expect(datePresetToRange('specific', { before: dayjs('2026-07-15') })).toEqual({
      modifiedAfter: undefined,
      modifiedBefore: dayjs('2026-07-15').endOf('day').toISOString(),
    });
  });
});

describe('changeSpecificDate', () => {
  test('When a date is set, then the other bound is preserved', () => {
    const current: SpecificDateRange = { after: dayjs('2026-07-01') };

    const next = changeSpecificDate(current, 'before', dayjs('2026-07-15'));

    expect(next.after).toBe(current.after);
    expect(next.before?.isSame(dayjs('2026-07-15'), 'day')).toBe(true);
  });

  test('When a date is cleared, then the bound becomes undefined', () => {
    const current: SpecificDateRange = { after: dayjs('2026-07-01'), before: dayjs('2026-07-15') };

    expect(changeSpecificDate(current, 'before', undefined).before).toBeUndefined();
  });

  test('When the new before precedes the current after, then the current range is returned unchanged', () => {
    const current: SpecificDateRange = { after: dayjs('2026-07-10') };

    expect(changeSpecificDate(current, 'before', dayjs('2026-07-05'))).toBe(current);
  });

  test('When the new after exceeds the current before, then the current range is returned unchanged', () => {
    const current: SpecificDateRange = { before: dayjs('2026-07-10') };

    expect(changeSpecificDate(current, 'after', dayjs('2026-07-20'))).toBe(current);
  });

  test('When both dates fall on the same day, then the change is accepted', () => {
    const current: SpecificDateRange = { after: dayjs('2026-07-10') };

    const next = changeSpecificDate(current, 'before', dayjs('2026-07-10'));

    expect(next.before?.isSame(dayjs('2026-07-10'), 'day')).toBe(true);
  });
});

describe('isDateFilterActive', () => {
  test('When the preset is any, then the filter is not active', () => {
    expect(isDateFilterActive('any', {})).toBe(false);
  });

  test('When a bounded preset is selected, then the filter is active', () => {
    expect(isDateFilterActive('today', {})).toBe(true);
    expect(isDateFilterActive('lastYear', {})).toBe(true);
  });

  test('When the specific preset is selected with no dates, then the filter is not active', () => {
    expect(isDateFilterActive('specific', {})).toBe(false);
  });

  test('When the specific preset is selected with one date, then the filter is active', () => {
    expect(isDateFilterActive('specific', { after: dayjs('2026-07-10') })).toBe(true);
    expect(isDateFilterActive('specific', { before: dayjs('2026-07-10') })).toBe(true);
  });
});

describe('formatDateInput', () => {
  test('When only digits are typed, then the separators are added as the date is completed', () => {
    expect(formatDateInput('0')).toBe('0');
    expect(formatDateInput('010')).toBe('01/0');
    expect(formatDateInput('01072026')).toBe('01/07/2026');
  });

  test('When characters that are not digits are typed, then they are dropped', () => {
    expect(formatDateInput('abc')).toBe('');
    expect(formatDateInput('01-07-2026')).toBe('01/07/2026');
    expect(formatDateInput('1a/b7')).toBe('17');
  });

  test('When more than eight digits are typed, then the extra ones are dropped', () => {
    expect(formatDateInput('010720261234')).toBe('01/07/2026');
  });

  test('When the text is emptied, then an empty string is returned', () => {
    expect(formatDateInput('')).toBe('');
  });
});
