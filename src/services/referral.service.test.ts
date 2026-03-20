import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./local-storage.service', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('./env.service', () => ({
  default: {
    getVariable: vi.fn(),
  },
}));

vi.mock('./date.service', () => ({
  default: {
    getDaysSince: vi.fn(),
  },
}));

vi.mock('app/core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(() => ({
      createReferralsClient: vi.fn(() => ({
        createReferralToken: vi.fn().mockResolvedValue({ token: 'mock-token' }),
      })),
    })),
  },
}));

vi.mock('utils/loadExternalScript', () => ({
  loadExternalScript: vi.fn().mockResolvedValue(undefined),
}));

import localStorageService from './local-storage.service';
import envService from './env.service';
import dateService from './date.service';
import referralService from './referral.service';

const BANNER_STATE_KEY = 'referral_banner_state';
const UCC_STORAGE_KEY = 'cello_ucc';
const BANNER_SESSION_COUNTED_KEY = 'referral_banner_session_counted';

const buildBannerState = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    isDismissed: false,
    isModalOpened: false,
    showCount: 0,
    fileUploadCount: 0,
    hasFolderUploaded: false,
    hasShareCreated: false,
    appOpenDays: [],
    ...overrides,
  });

const mockBannerState = (overrides: Record<string, unknown> = {}, uccValue: string | null = null) => {
  vi.mocked(localStorageService.get).mockImplementation((key: string) => {
    if (key === BANNER_STATE_KEY) return buildBannerState(overrides);
    if (key === UCC_STORAGE_KEY) return uccValue;
    return null;
  });
};

const expectBannerStateSaved = (fragment: string) => {
  expect(localStorageService.set).toHaveBeenCalledWith(BANNER_STATE_KEY, expect.stringContaining(fragment));
};

describe('referralService', () => {
  beforeEach(() => {
    vi.mocked(localStorageService.get).mockReturnValue(null as unknown as string);
    vi.mocked(localStorageService.set).mockReturnValue(undefined);
    vi.mocked(envService.getVariable).mockReturnValue('');
    vi.mocked(dateService.getDaysSince).mockReturnValue(0);
  });

  afterEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    delete globalThis.cello;
    delete globalThis.Cello;
    delete globalThis.CelloAttribution;
  });

  describe('shouldShowBanner', () => {
    it.each([
      {
        scenario: 'when the user has dismissed the banner, then the banner is not shown',
        state: { isDismissed: true, fileUploadCount: 5 },
        ucc: null,
        expected: false,
      },
      {
        scenario: 'when the user has already opened the referral modal, then the banner is not shown',
        state: { isModalOpened: true, fileUploadCount: 5 },
        ucc: null,
        expected: false,
      },
      {
        scenario: 'when the user was referred by someone, then the banner is not shown',
        state: { fileUploadCount: 5 },
        ucc: 'some-ucc',
        expected: false,
      },
      {
        scenario: 'when the banner has been shown the maximum number of times, then the banner is not shown',
        state: { showCount: 2, fileUploadCount: 5 },
        ucc: null,
        expected: false,
      },
      {
        scenario: 'when the user has no engagement activity, then the banner is not shown',
        state: {},
        ucc: null,
        expected: false,
      },
      {
        scenario: 'when the user has uploaded enough files, then the banner is shown',
        state: { fileUploadCount: 3 },
        ucc: null,
        expected: true,
      },
      {
        scenario: 'when the user has uploaded a folder, then the banner is shown',
        state: { hasFolderUploaded: true },
        ucc: null,
        expected: true,
      },
      {
        scenario: 'when the user has shared a file or folder, then the banner is shown',
        state: { hasShareCreated: true },
        ucc: null,
        expected: true,
      },
      {
        scenario: 'when the user has used the app on enough different days, then the banner is shown',
        state: { appOpenDays: ['2026-01-01', '2026-01-02', '2026-01-03'] },
        ucc: null,
        expected: true,
      },
    ])('$scenario', ({ state, ucc, expected }) => {
      mockBannerState(state, ucc);

      expect(referralService.shouldShowBanner()).toBe(expected);
    });
  });

  describe('tracking events', () => {
    it.each([
      {
        scenario: 'when a file is uploaded, then the upload count is incremented',
        initialState: { fileUploadCount: 2 },
        action: () => referralService.trackFileUpload(),
        expectedFragment: '"fileUploadCount":3',
      },
      {
        scenario: 'when a folder is uploaded, then the folder upload is recorded',
        initialState: {},
        action: () => referralService.trackFolderUpload(),
        expectedFragment: '"hasFolderUploaded":true',
      },
      {
        scenario: 'when a share is created, then the share activity is recorded',
        initialState: {},
        action: () => referralService.trackShareCreated(),
        expectedFragment: '"hasShareCreated":true',
      },
      {
        scenario: 'when the user dismisses the banner, then the dismissal is saved',
        initialState: {},
        action: () => referralService.dismissBanner(),
        expectedFragment: '"isDismissed":true',
      },
      {
        scenario: 'when the referral modal is opened, then the interaction is saved',
        initialState: {},
        action: () => referralService.markReferralModalOpened(),
        expectedFragment: '"isModalOpened":true',
      },
    ])('$scenario', ({ initialState, action, expectedFragment }) => {
      mockBannerState(initialState);

      action();

      expectBannerStateSaved(expectedFragment);
    });
  });

  describe('trackAppOpenDay', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-19T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('when the user opens the app on a new day, then that day is recorded', () => {
      mockBannerState({ appOpenDays: ['2026-03-18'] });

      referralService.trackAppOpenDay();

      expectBannerStateSaved('"appOpenDays":["2026-03-18","2026-03-19"]');
    });

    it('when the user opens the app again on the same day, then no duplicate is added', () => {
      mockBannerState({ appOpenDays: ['2026-03-19'] });

      referralService.trackAppOpenDay();

      expect(localStorageService.set).not.toHaveBeenCalled();
    });
  });

  describe('incrementBannerShowCount', () => {
    it('when the banner is shown for the first time in a session, then the show count increases', () => {
      mockBannerState({ showCount: 0 });

      referralService.incrementBannerShowCount();

      expectBannerStateSaved('"showCount":1');
      expect(sessionStorage.getItem(BANNER_SESSION_COUNTED_KEY)).toBe('true');
    });

    it('when the banner has already been counted in this session, then the count does not increase again', () => {
      sessionStorage.setItem(BANNER_SESSION_COUNTED_KEY, 'true');

      referralService.incrementBannerShowCount();

      expect(localStorageService.set).not.toHaveBeenCalled();
    });
  });

  describe('onTrigger', () => {
    it('when an engagement event occurs, then registered listeners are notified', () => {
      const listener = vi.fn();
      mockBannerState();

      const unsubscribe = referralService.onTrigger(listener);
      referralService.trackShareCreated();

      expect(listener).toHaveBeenCalledOnce();
      unsubscribe();
    });

    it('when a listener unsubscribes, then it is no longer notified of events', () => {
      const listener = vi.fn();
      mockBannerState();

      const unsubscribe = referralService.onTrigger(listener);
      unsubscribe();
      referralService.trackShareCreated();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('isEligibleForReferral', () => {
    it('when no account creation date is provided, then the user is eligible', () => {
      expect(referralService.isEligibleForReferral()).toBe(true);
    });

    it.each([
      { scenario: 'when the account is older than 30 days, then the user is eligible', days: 31, expected: true },
      { scenario: 'when the account is exactly 30 days old, then the user is eligible', days: 30, expected: true },
      {
        scenario: 'when the account is younger than 30 days, then the user is not eligible',
        days: 15,
        expected: false,
      },
    ])('$scenario', ({ days, expected }) => {
      vi.mocked(dateService.getDaysSince).mockReturnValue(days);

      expect(referralService.isEligibleForReferral(new Date())).toBe(expected);
    });
  });

  describe('changeLanguage', () => {
    it('when the referral widget is loaded, then the language is updated', async () => {
      const mockCello = vi.fn().mockResolvedValue(undefined);
      globalThis.Cello = mockCello;

      await referralService.changeLanguage('es');

      expect(mockCello).toHaveBeenCalledWith('changeLanguage', 'es');
    });
  });

  describe('boot', () => {
    it('when the referral widget fails to load, then the error is handled gracefully', async () => {
      vi.mocked(envService.getVariable).mockReturnValue('https://assets.example.com');
      const { loadExternalScript } = await import('utils/loadExternalScript');
      vi.mocked(loadExternalScript).mockRejectedValueOnce(new Error('network error'));

      await expect(
        referralService.boot({ name: 'John', lastname: 'Doe', email: 'john@example.com' }),
      ).resolves.toBeUndefined();
    });
  });
});
