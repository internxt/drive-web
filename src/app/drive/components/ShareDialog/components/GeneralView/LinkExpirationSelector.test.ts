import dayjs from 'dayjs';
import { describe, expect, test } from 'vitest';
import { getLinkExpirationRange } from './LinkExpirationSelector';

describe('getLinkExpirationRange', () => {
  const today = dayjs('2026-09-29T15:30:00');

  test('When getting the range, then the min date is the start of today so the link can expire the same day', () => {
    const { minDate } = getLinkExpirationRange(today);

    expect(minDate.format('YYYY-MM-DD HH:mm:ss')).toBe('2026-09-29 00:00:00');
  });

  test('When getting the range, then the max date is the end of the same day one year later', () => {
    const { maxDate } = getLinkExpirationRange(today);

    expect(maxDate.format('YYYY-MM-DD HH:mm:ss')).toBe('2027-09-29 23:59:59');
  });

  test('When today is a leap day, then the max date falls back to the last day of February of the next year', () => {
    const { maxDate } = getLinkExpirationRange(dayjs('2028-02-29T10:00:00'));

    expect(maxDate.format('YYYY-MM-DD')).toBe('2029-02-28');
  });
});
