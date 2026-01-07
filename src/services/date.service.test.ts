import dayjs from 'dayjs';
import { describe, expect, test } from 'vitest';
import dateService from './date.service';

describe('dateService', () => {
  test('format function should correctly format a date string', () => {
    const date = '2023-01-10T07:26:43.727Z';
    const format = 'MM/DD/YYYY';
    const formattedDate = dateService.format(date, format);

    expect(formattedDate).toBe(dayjs(date).format(format));
    expect(formattedDate).toBe('01/10/2023');
  });

  test('fromNow function should correctly return a string describing the time elapsed since a given date', () => {
    const date = new Date();
    const fromNow = dateService.fromNow(date);

    expect(fromNow).toBe(dayjs(date).fromNow());
    expect(fromNow).toBe('a few seconds ago');
  });

  test('isDateOneBefore function should correctly determine if one date is before another', () => {
    const dateOne = new Date();
    const dateTwo = new Date(Date.now() + 1000);
    const isBefore = dateService.isDateOneBefore({ dateOne, dateTwo });

    expect(isBefore).toBe(true);
  });

  test('isDateOneBefore function should return false because dateOne is after dateTwo', () => {
    const dateOne = new Date(Date.now() + 1000);
    const dateTwo = new Date();
    const isBefore = dateService.isDateOneBefore({ dateOne, dateTwo });

    expect(isBefore).toBe(false);
  });

  describe('calculateDaysUntilDate', () => {
    test('when target date is undefined, then returns 0', () => {
      const result = dateService.calculateDaysUntilDate();
      expect(result).toBe(0);
    });

    test('when target date is in the past, then returns 0', () => {
      const pastDate = dayjs().subtract(5, 'day').toISOString();
      const result = dateService.calculateDaysUntilDate(pastDate);
      expect(result).toBe(0);
    });

    test('when target date is 10 days in the future, then returns 10', () => {
      const futureDate = dayjs().add(10, 'day').toISOString();
      const result = dateService.calculateDaysUntilDate(futureDate);
      expect(result).toBe(10);
    });

    test('when target date is tomorrow, then returns 1', () => {
      const tomorrow = dayjs().add(1, 'day').toISOString();
      const result = dateService.calculateDaysUntilDate(tomorrow);
      expect(result).toBe(1);
    });

    test('when target date is a Date object 30 days ahead, then returns 30', () => {
      const futureDate = dayjs().add(30, 'day').toDate();
      const result = dateService.calculateDaysUntilDate(futureDate);
      expect(result).toBe(30);
    });
  });
});
