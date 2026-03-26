import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import envService from './env.service';
import dateService from './date.service';
import { loadExternalScript } from 'utils/loadExternalScript';
import type referralServiceType from './referral.service';

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

const mockRefreshUser = vi.fn().mockResolvedValue({ user: { emailVerified: true } });

vi.mock('app/core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(() => ({
      createReferralsClient: vi.fn(() => ({
        createReferralToken: vi.fn().mockResolvedValue({ token: 'mock-token' }),
        isReferralEnabled: vi.fn().mockResolvedValue({ isEnabled: true }),
      })),
      createUsersClient: vi.fn(() => ({
        refreshUser: mockRefreshUser,
      })),
    })),
  },
}));

vi.mock('utils/loadExternalScript', () => ({
  loadExternalScript: vi.fn().mockResolvedValue(undefined),
}));

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

const seedBannerState = (overrides: Record<string, unknown> = {}, uccValue: string | null = null) => {
  localStorage.setItem(BANNER_STATE_KEY, buildBannerState(overrides));
  if (uccValue) {
    localStorage.setItem(UCC_STORAGE_KEY, uccValue);
  }
};

const expectBannerStateSaved = (fragment: string) => {
  const saved = localStorage.getItem(BANNER_STATE_KEY);
  expect(saved).toContain(fragment);
};

const mockUser = { name: 'John', lastname: 'Doe', email: 'john@example.com', emailVerified: true };

const setupCelloBootFlow = () => {
  vi.mocked(envService.getVariable).mockImplementation((key: string) => {
    if (key === 'celloAssetsUrl') return 'https://assets.example.com';
    if (key === 'celloProductId') return 'test-product-id';
    return '';
  });

  const mockBoot = vi.fn().mockResolvedValue(undefined);

  vi.mocked(loadExternalScript).mockImplementation(async () => {
    const autoExecCmd = {
      push: (fn: (cello: { boot: typeof mockBoot }) => void) => fn({ boot: mockBoot }),
    };
    globalThis.cello = { cmd: autoExecCmd as unknown as typeof globalThis.cello.cmd };
  });

  return { mockBoot };
};

const importFreshReferralService = async (): Promise<typeof referralServiceType> => {
  vi.resetModules();
  const module = await import('./referral.service');
  return module.default;
};

describe('referralService', () => {
  let referralService: typeof referralServiceType;

  beforeEach(async () => {
    localStorage.clear();
    vi.mocked(envService.getVariable).mockReturnValue('');
    vi.mocked(dateService.getDaysSince).mockReturnValue(0);
    vi.mocked(loadExternalScript).mockResolvedValue(undefined);
    referralService = await importFreshReferralService();
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
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
      seedBannerState(state, ucc);

      expect(referralService.shouldShowBanner()).toBe(expected);
    });
  });

  describe('isEligibleForReferral', () => {
    it('when no account creation date is provided, then the user is eligible', async () => {
      expect(await referralService.isEligibleForReferral()).toBe(true);
    });

    it.each([
      { scenario: 'when the account is older than 30 days, then the user is eligible', days: 31, expected: true },
      { scenario: 'when the account is exactly 30 days old, then the user is eligible', days: 30, expected: true },
      {
        scenario: 'when the account is younger than 30 days, then the user is not eligible',
        days: 15,
        expected: false,
      },
    ])('$scenario', async ({ days, expected }) => {
      vi.mocked(dateService.getDaysSince).mockReturnValue(days);

      expect(await referralService.isEligibleForReferral(new Date())).toBe(expected);
    });
  });
  describe('tracking events', () => {
    it.each([
      {
        scenario: 'when a file is uploaded, then the upload count is incremented',
        initialState: { fileUploadCount: 2 },
        action: 'trackFileUpload' as const,
        expectedFragment: '"fileUploadCount":3',
      },
      {
        scenario: 'when a folder is uploaded, then the folder upload is recorded',
        initialState: {},
        action: 'trackFolderUpload' as const,
        expectedFragment: '"hasFolderUploaded":true',
      },
      {
        scenario: 'when a share is created, then the share activity is recorded',
        initialState: {},
        action: 'trackShareCreated' as const,
        expectedFragment: '"hasShareCreated":true',
      },
      {
        scenario: 'when the user dismisses the banner, then the dismissal is saved',
        initialState: {},
        action: 'dismissBanner' as const,
        expectedFragment: '"isDismissed":true',
      },
      {
        scenario: 'when the referral modal is opened, then the interaction is saved',
        initialState: {},
        action: 'markReferralModalOpened' as const,
        expectedFragment: '"isModalOpened":true',
      },
    ])('$scenario', ({ initialState, action, expectedFragment }) => {
      seedBannerState(initialState);

      referralService[action]();

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
      seedBannerState({ appOpenDays: ['2026-03-18'] });

      referralService.trackAppOpenDay();

      expectBannerStateSaved('"appOpenDays":["2026-03-18","2026-03-19"]');
    });

    it('when the user opens the app again on the same day, then no duplicate is added', () => {
      seedBannerState({ appOpenDays: ['2026-03-19'] });

      referralService.trackAppOpenDay();

      const saved = JSON.parse(localStorage.getItem(BANNER_STATE_KEY) ?? '{}');
      expect(saved.appOpenDays).toEqual(['2026-03-19']);
    });
  });

  describe('incrementBannerShowCount', () => {
    it('when the banner is shown for the first time in a session, then the show count increases', () => {
      seedBannerState({ showCount: 0 });

      referralService.incrementBannerShowCount();

      expectBannerStateSaved('"showCount":1');
      expect(sessionStorage.getItem(BANNER_SESSION_COUNTED_KEY)).toBe('true');
    });

    it('when the banner has already been counted in this session, then the count does not increase again', () => {
      seedBannerState({ showCount: 1 });
      sessionStorage.setItem(BANNER_SESSION_COUNTED_KEY, 'true');

      referralService.incrementBannerShowCount();

      const saved = JSON.parse(localStorage.getItem(BANNER_STATE_KEY) ?? '{}');
      expect(saved.showCount).toBe(1);
    });
  });

  describe('onTrigger', () => {
    it('when an engagement event occurs, then registered listeners are notified', () => {
      const listener = vi.fn();
      seedBannerState();

      const unsubscribe = referralService.onTrigger(listener);
      referralService.trackShareCreated();

      expect(listener).toHaveBeenCalledOnce();
      unsubscribe();
    });

    it('when a listener unsubscribes, then it is no longer notified of events', () => {
      const listener = vi.fn();
      seedBannerState();

      const unsubscribe = referralService.onTrigger(listener);
      unsubscribe();
      referralService.trackShareCreated();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('getCustomLauncherLabel', () => {
    it('when the Cello widget is loaded, then the custom launcher label is returned', async () => {
      const mockCello = vi.fn().mockResolvedValue({ customLauncher: 'Give 85% off' });
      globalThis.Cello = mockCello;

      const label = await referralService.getCustomLauncherLabel();

      expect(mockCello).toHaveBeenCalledWith('getLabels');
      expect(label).toBe('Give 85% off');
    });

    it('when the Cello widget is not available, then undefined is returned', async () => {
      delete globalThis.Cello;

      const label = await referralService.getCustomLauncherLabel();

      expect(label).toBeUndefined();
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

  describe('captureUcc', () => {
    it('when the attribution script returns a UCC, then it is stored and returned', async () => {
      vi.mocked(envService.getVariable).mockReturnValue('https://assets.example.com');
      globalThis.CelloAttribution = vi.fn().mockResolvedValue('attribution-ucc');

      const result = await referralService.captureUcc();

      expect(result).toBe('attribution-ucc');
      expect(localStorage.getItem(UCC_STORAGE_KEY)).toBe('attribution-ucc');
    });

    it('when the attribution fails, then null is returned', async () => {
      vi.mocked(loadExternalScript).mockRejectedValueOnce(new Error('unavailable'));

      const result = await referralService.captureUcc();

      expect(result).toBeNull();
    });
  });

  describe('boot', () => {
    it('when the referral widget loads successfully, then the SDK is initialized with user details', async () => {
      const { mockBoot } = setupCelloBootFlow();

      await referralService.boot(mockUser, 'fr');

      expect(mockBoot).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'test-product-id',
          token: 'mock-token',
          language: 'fr',
          productUserDetails: expect.objectContaining({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          }),
          hideDefaultLauncher: true,
        }),
      );
    });

    it('when the external script fails to load, then the error is handled gracefully', async () => {
      vi.mocked(loadExternalScript).mockRejectedValueOnce(new Error('network error'));

      await expect(referralService.boot(mockUser)).resolves.toBeUndefined();
    });

    it('when the product ID is not configured, then boot stops without calling the SDK', async () => {
      vi.mocked(envService.getVariable).mockImplementation((key: string) => {
        if (key === 'celloAssetsUrl') return 'https://assets.example.com';
        return '';
      });

      await referralService.boot(mockUser);

      expect(globalThis.cello).toBeUndefined();
    });
  });

  describe('openPanel', () => {
    it('when the panel is opened, then the referral modal is marked as opened', async () => {
      setupCelloBootFlow();
      const mockCello = vi.fn().mockResolvedValue(undefined);
      globalThis.Cello = mockCello;

      await referralService.openPanel(mockUser);

      expect(mockCello).toHaveBeenCalledWith('open');
      expectBannerStateSaved('"isModalOpened":true');
    });

    it('when the Cello widget is not available after boot, then the panel does not open', async () => {
      setupCelloBootFlow();
      delete globalThis.Cello;

      await referralService.openPanel(mockUser);

      const saved = localStorage.getItem(BANNER_STATE_KEY);
      expect(saved).toBeNull();
    });

    it('when the API returns emailVerified true but the passed-in value is false, then the panel opens', async () => {
      setupCelloBootFlow();
      const mockCello = vi.fn().mockResolvedValue(undefined);
      globalThis.Cello = mockCello;
      mockRefreshUser.mockResolvedValueOnce({ user: { emailVerified: true } });

      const unverifiedUser = { ...mockUser, emailVerified: false };
      await referralService.openPanel(unverifiedUser);

      expect(mockCello).toHaveBeenCalledWith('open');
    });

    it('when the API call fails, then it falls back to the passed-in emailVerified value', async () => {
      mockRefreshUser.mockRejectedValueOnce(new Error('network error'));

      const unverifiedUser = { ...mockUser, emailVerified: false };
      await referralService.openPanel(unverifiedUser);

      expect(globalThis.Cello).toBeUndefined();
    });

    it('when email is already verified, then the panel opens', async () => {
      const mockCello = vi.fn().mockResolvedValue(undefined);
      globalThis.Cello = mockCello;
      mockRefreshUser.mockResolvedValueOnce({ user: { emailVerified: false } });

      await referralService.openPanel(mockUser);

      expect(mockRefreshUser).not.toHaveBeenCalled();
      expect(mockCello).toHaveBeenCalledWith('open');
      expect(mockCello).not.toHaveBeenCalledWith('close');
    });
  });
});
