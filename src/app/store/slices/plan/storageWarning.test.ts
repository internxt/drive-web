import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  calculateUsedPercentage,
  getReachedStorageWarningStage,
  isStageInCooldown,
  openUpgradeSpecialOffer,
  readDismissals,
  writeDismissal,
  SPECIAL_OFFER_URL,
  STORAGE_WARNING_STAGES,
  StorageWarningStage,
} from './storageWarning';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DISMISSALS_STORAGE_KEY = 'storageWarningBannerDismissals';

const stageByKey = (key: StorageWarningStage['key']): StorageWarningStage =>
  STORAGE_WARNING_STAGES.find((stage) => stage.key === key) as StorageWarningStage;

describe('calculateUsedPercentage', () => {
  test('When usage is part of the available limit, then it returns the percentage used', () => {
    expect(calculateUsedPercentage(50, 200)).toBe(25);
  });

  test('When the limit is zero, then it returns zero to avoid dividing by zero', () => {
    expect(calculateUsedPercentage(50, 0)).toBe(0);
  });
});

describe('getReachedStorageWarningStage', () => {
  test('When usage is below every threshold, then no stage is reached', () => {
    expect(getReachedStorageWarningStage(50)).toBeUndefined();
  });

  test('When usage crosses the lowest threshold, then the low warning stage is reached', () => {
    expect(getReachedStorageWarningStage(65)?.key).toBe('lowWarning');
  });

  test('When usage crosses the middle threshold, then the mid warning stage is reached', () => {
    expect(getReachedStorageWarningStage(85)?.key).toBe('midWarning');
  });

  test('When usage is almost at the limit, then the most severe stage is reached', () => {
    expect(getReachedStorageWarningStage(96)?.key).toBe('highWarning');
  });

  test('When usage matches a threshold exactly, then that stage is reached', () => {
    expect(getReachedStorageWarningStage(60)?.key).toBe('lowWarning');
  });
});

describe('openUpgradeSpecialOffer', () => {
  test('When the upgrade offer is opened, then the special offer page is opened in a safe new tab', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    openUpgradeSpecialOffer();

    expect(openSpy).toHaveBeenCalledWith(SPECIAL_OFFER_URL, '_blank', 'noopener,noreferrer');
    openSpy.mockRestore();
  });
});

describe('storage warning dismissals persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  test('When no dismissal has been stored yet, then reading dismissals returns an empty record', () => {
    expect(readDismissals()).toEqual({});
  });

  test('When a stage is dismissed, then its dismissal time can be read back', () => {
    writeDismissal('lowWarning', 1000);

    expect(readDismissals()).toEqual({ lowWarning: 1000 });
  });

  test('When several stages are dismissed, then each dismissal time is kept', () => {
    writeDismissal('lowWarning', 1000);
    writeDismissal('highWarning', 2000);

    expect(readDismissals()).toEqual({ lowWarning: 1000, highWarning: 2000 });
  });

  test('When the same stage is dismissed again, then its dismissal time is overwritten', () => {
    writeDismissal('lowWarning', 1000);
    writeDismissal('lowWarning', 5000);

    expect(readDismissals()).toEqual({ lowWarning: 5000 });
  });

  test('When the stored dismissals are corrupted, then reading them falls back to an empty record', () => {
    localStorage.setItem(DISMISSALS_STORAGE_KEY, 'not-valid-json');

    expect(readDismissals()).toEqual({});
  });

  test('When the stored dismissals are not an object, then reading them falls back to an empty record', () => {
    localStorage.setItem(DISMISSALS_STORAGE_KEY, JSON.stringify('a string'));

    expect(readDismissals()).toEqual({});
  });

  test('When persisting a dismissal fails, then the error is swallowed without throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage full');
    });

    expect(() => writeDismissal('lowWarning', 1000)).not.toThrow();
  });
});

describe('isStageInCooldown', () => {
  const now = 10 * DAY_IN_MS;

  test('When a stage has never been dismissed, then it is not in cooldown', () => {
    expect(isStageInCooldown(stageByKey('lowWarning'), {}, now)).toBe(false);
  });

  test('When a stage was dismissed within its cooldown window, then it is still in cooldown', () => {
    const lowWarning = stageByKey('lowWarning');
    const dismissedAt = now - 2 * DAY_IN_MS;

    expect(isStageInCooldown(lowWarning, { lowWarning: dismissedAt }, now)).toBe(true);
  });

  test('When the cooldown window of a dismissed stage has elapsed, then it is no longer in cooldown', () => {
    const lowWarning = stageByKey('lowWarning');
    const dismissedAt = now - (lowWarning.cooldownDays + 1) * DAY_IN_MS;

    expect(isStageInCooldown(lowWarning, { lowWarning: dismissedAt }, now)).toBe(false);
  });
});
