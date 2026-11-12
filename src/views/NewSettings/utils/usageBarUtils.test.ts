import { describe, expect, test } from 'vitest';
import { getUsageBarPercentages } from './usageBarUtils';

const GB = 1024 ** 3;

const getPercentages = (overrides = {}) =>
  getUsageBarPercentages({
    driveUsageBytes: 0,
    backupsUsageBytes: 0,
    spaceLimitBytes: 10 * GB,
    ...overrides,
  });

describe('getUsageBarPercentages', () => {
  test('when usage is under the limit, then percentages are relative to the limit and not over limit', () => {
    const result = getPercentages({ driveUsageBytes: 2.5 * GB, backupsUsageBytes: 5 * GB });

    expect(result).toEqual({ drivePercentage: 25, backupPercentage: 50, isOverLimit: false });
  });

  test('when usage is exactly the limit, then the bar is full and not over limit', () => {
    const result = getPercentages({ driveUsageBytes: 4 * GB, backupsUsageBytes: 6 * GB });

    expect(result).toEqual({ drivePercentage: 40, backupPercentage: 60, isOverLimit: false });
  });

  test('when drive plus backups are over the limit, then they are scaled to 100% keeping their ratio', () => {
    const result = getPercentages({ driveUsageBytes: 15 * GB, backupsUsageBytes: 5 * GB });

    expect(result).toEqual({ drivePercentage: 75, backupPercentage: 25, isOverLimit: true });
  });

  test('when the limit is zero and there is usage, then the bar is full and over limit', () => {
    const result = getPercentages({ driveUsageBytes: GB, spaceLimitBytes: 0 });

    expect(result).toEqual({ drivePercentage: 100, backupPercentage: 0, isOverLimit: true });
  });

  test('when there is no usage, then nothing is drawn even with an invalid limit', () => {
    const result = getPercentages({ spaceLimitBytes: Number.NaN });

    expect(result).toEqual({ drivePercentage: 0, backupPercentage: 0, isOverLimit: false });
  });

  test('when values are not finite, then percentages are never NaN or Infinity', () => {
    const result = getPercentages({
      driveUsageBytes: Number.NaN,
      backupsUsageBytes: Infinity,
      spaceLimitBytes: Infinity,
    });

    expect(Number.isFinite(result.drivePercentage)).toBe(true);
    expect(Number.isFinite(result.backupPercentage)).toBe(true);
  });
});
