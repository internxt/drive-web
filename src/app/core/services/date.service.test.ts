import moment from 'moment';
import dateService from './date.service';

describe('dateService', () => {
  test('format function should correctly format a date string', () => {
    const date = new Date();
    const format = 'MM/DD/YYYY';
    const formattedDate = dateService.format(date, format);

    expect(formattedDate).toBe(moment(date).format(format));
  });

  test('fromNow function should correctly return a string describing the time elapsed since a given date', () => {
    const date = new Date();
    const fromNow = dateService.fromNow(date);

    expect(fromNow).toBe(moment(date).fromNow());
  });

  test('isDateOneBefore function should correctly determine if one date is before another', () => {
    const dateOne = new Date();
    const dateTwo = new Date(Date.now() + 1000);
    const isBefore = dateService.isDateOneBefore({ dateOne, dateTwo });

    expect(isBefore).toBe(true);
  });
});
