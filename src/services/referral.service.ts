import localStorageService from './local-storage.service';
import envService from './env.service';
import { SdkFactory } from 'app/core/factory/sdk';
import { loadExternalScript } from 'utils/loadExternalScript';

const MAX_BANNER_SHOW_COUNT = 2;
const MIN_FILE_UPLOADS_FOR_BANNER = 3;
const MIN_APP_OPEN_DAYS_FOR_BANNER = 3;

interface ReferralUser {
  name: string;
  lastname: string;
  email: string;
}

const UCC_STORAGE_KEY = 'cello_ucc';
const BANNER_STATE_KEY = 'referral_banner_state';

interface BannerState {
  isDismissed: boolean;
  isModalOpened: boolean;
  showCount: number;
  fileUploadCount: number;
  hasFolderUploaded: boolean;
  hasShareCreated: boolean;
  appOpenDays: string[];
}

const DEFAULT_BANNER_STATE: BannerState = {
  isDismissed: false,
  isModalOpened: false,
  showCount: 0,
  fileUploadCount: 0,
  hasFolderUploaded: false,
  hasShareCreated: false,
  appOpenDays: [],
};

const getBannerState = (): BannerState => {
  const stored = localStorageService.get(BANNER_STATE_KEY);
  return stored ? { ...DEFAULT_BANNER_STATE, ...JSON.parse(stored) } : { ...DEFAULT_BANNER_STATE };
};

const updateBannerState = (update: Partial<BannerState>): void => {
  const state = { ...getBannerState(), ...update };
  localStorageService.set(BANNER_STATE_KEY, JSON.stringify(state));
};

let bootPromise: Promise<void> | null = null;
const triggerListeners = new Set<() => void>();

const emitTriggerEvent = (): void => {
  triggerListeners.forEach((listener) => listener());
};

const trackAndEmit = (update: Partial<BannerState>): void => {
  updateBannerState(update);
  emitTriggerEvent();
};

const fetchReferralToken = async (): Promise<string> => {
  const referralsClient = SdkFactory.getNewApiInstance().createReferralsClient();
  const { token } = await referralsClient.createReferralToken();
  return token;
};

const initializeSdk = (options: ReferralBootOptions): Promise<void> => {
  globalThis.cello = globalThis.cello || { cmd: [] };

  return new Promise<void>((resolve, reject) => {
    globalThis.cello!.cmd.push(async (cello) => {
      try {
        await cello.boot(options);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
};

const loadAndBoot = async (user: ReferralUser, language?: string): Promise<void> => {
  if (bootPromise) return bootPromise;

  bootPromise = (async () => {
    const assetsUrl = envService.getVariable('celloAssetsUrl');
    await loadExternalScript(`${assetsUrl}/app/latest/cello.js`);

    const productId = envService.getVariable('celloProductId');
    if (!productId) {
      console.error('Referral product ID is not configured');
      return;
    }

    const token = await fetchReferralToken();
    await initializeSdk({
      productId,
      token,
      language: language ?? 'en',
      productUserDetails: {
        firstName: user.name,
        lastName: user.lastname,
        fullName: `${user.name} ${user.lastname}`.trim(),
        email: user.email,
      },
      hideDefaultLauncher: true,
    });
  })();

  try {
    await bootPromise;
  } catch (error) {
    bootPromise = null;
    throw error;
  }
};

const openPanel = async (user: ReferralUser, language?: string): Promise<void> => {
  await loadAndBoot(user, language);
  if (!globalThis.Cello) return;
  markReferralModalOpened();
  await globalThis.Cello('open');
};

const ATTRIBUTION_POLL_INTERVAL_MS = 100;
const ATTRIBUTION_TIMEOUT_MS = 5000;

const waitForCelloAttribution = (): Promise<NonNullable<typeof globalThis.CelloAttribution>> => {
  return new Promise((resolve, reject) => {
    if (typeof globalThis.CelloAttribution === 'function') {
      resolve(globalThis.CelloAttribution);
      return;
    }

    const intervalId = setInterval(() => {
      if (typeof globalThis.CelloAttribution === 'function') {
        clearInterval(intervalId);
        resolve(globalThis.CelloAttribution);
      }
    }, ATTRIBUTION_POLL_INTERVAL_MS);

    setTimeout(() => {
      clearInterval(intervalId);
      reject(new Error('[Cello Attribution] Timed out waiting for CelloAttribution'));
    }, ATTRIBUTION_TIMEOUT_MS);
  });
};

const captureUccFromAttribution = async (): Promise<string | null> => {
  try {
    const assetsUrl = envService.getVariable('celloAssetsUrl');
    const productId = envService.getVariable('celloProductId');
    await loadExternalScript(`${assetsUrl}/attribution/latest/cello-attribution.js`, {
      dataAttributes: { productId: productId },
    });
    const celloAttribution = await waitForCelloAttribution();
    const ucc = await celloAttribution('getUcc');
    if (ucc) {
      localStorageService.set(UCC_STORAGE_KEY, ucc);
      return ucc;
    }
  } catch (error) {
    console.warn('[Cello Attribution] Script unavailable, falling back to URL param', error);
  }
  return null;
};

const captureUcc = async (): Promise<string | null> => {
  const attributionUcc = await captureUccFromAttribution();
  if (attributionUcc) return attributionUcc;

  const params = new URLSearchParams(globalThis.location.search);
  const uccFromUrl = params.get('ucc');

  if (!uccFromUrl) return null;

  localStorageService.set(UCC_STORAGE_KEY, uccFromUrl);
  return uccFromUrl;
};

const getStoredUcc = (): string | null => {
  return localStorageService.get(UCC_STORAGE_KEY) ?? null;
};

const trackFileUpload = (): void => {
  const state = getBannerState();
  trackAndEmit({ fileUploadCount: state.fileUploadCount + 1 });
};

const trackFolderUpload = (): void => {
  trackAndEmit({ hasFolderUploaded: true });
};

const trackShareCreated = (): void => {
  trackAndEmit({ hasShareCreated: true });
};

const trackAppOpenDay = (): void => {
  const state = getBannerState();
  const today = new Date().toISOString().split('T')[0];
  if (!state.appOpenDays.includes(today)) {
    updateBannerState({ appOpenDays: [...state.appOpenDays, today] });
  }
};

const dismissBanner = (): void => {
  updateBannerState({ isDismissed: true });
};

const markReferralModalOpened = (): void => {
  updateBannerState({ isModalOpened: true });
};

const incrementBannerShowCount = (): void => {
  const state = getBannerState();
  updateBannerState({ showCount: state.showCount + 1 });
};

const shouldShowBanner = (): boolean => {
  const state = getBannerState();

  if (state.isDismissed || state.isModalOpened) return false;
  if (localStorageService.get(UCC_STORAGE_KEY)) return false;
  if (state.showCount >= MAX_BANNER_SHOW_COUNT) return false;

  const hasEnoughFileUploads = state.fileUploadCount >= MIN_FILE_UPLOADS_FOR_BANNER;
  const hasEnoughAppOpenDays = state.appOpenDays.length >= MIN_APP_OPEN_DAYS_FOR_BANNER;

  return state.hasShareCreated || hasEnoughFileUploads || state.hasFolderUploaded || hasEnoughAppOpenDays;
};

const onTrigger = (listener: () => void): (() => void) => {
  triggerListeners.add(listener);
  return () => triggerListeners.delete(listener);
};

const changeLanguage = async (language: string): Promise<void> => {
  if (!globalThis.Cello) return;
  await globalThis.Cello('changeLanguage', language);
};

const boot = async (user: ReferralUser, language?: string): Promise<void> => {
  try {
    await loadAndBoot(user, language);
  } catch (error) {
    console.error('[Cello] Failed to boot:', error);
  }
};

const referralService = {
  boot,
  changeLanguage,
  openPanel,
  captureUcc,
  getStoredUcc,
  trackFileUpload,
  trackFolderUpload,
  trackShareCreated,
  trackAppOpenDay,
  dismissBanner,
  markReferralModalOpened,
  incrementBannerShowCount,
  shouldShowBanner,
  onTrigger,
};

export default referralService;
