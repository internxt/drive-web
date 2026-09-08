import { describe, expect, test } from 'vitest';
import { getCalendarLocale } from './DateCalendar';

describe('getCalendarLocale', () => {
  test('When the language is zh-TW, then the regional dayjs locale is kept because traditional Chinese has its own locale instead of a base one', () => {
    expect(getCalendarLocale('zh-TW')).toBe('zh-tw');
    expect(getCalendarLocale('zh-tw')).toBe('zh-tw');
  });

  test('When the language has a region suffix, then it falls back to the base dayjs locale', () => {
    expect(getCalendarLocale('es-ES')).toBe('es');
    expect(getCalendarLocale('en-US')).toBe('en');
    expect(getCalendarLocale('zh-CN')).toBe('zh');
  });

  test('When the language has no region suffix, then it is used as-is in lowercase', () => {
    expect(getCalendarLocale('fr')).toBe('fr');
    expect(getCalendarLocale('DE')).toBe('de');
  });
});
