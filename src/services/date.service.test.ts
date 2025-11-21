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
});
