import localStorageService from 'services/local-storage.service';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DISMISSALS_STORAGE_KEY = 'storageWarningBannerDismissals';

export type StorageWarning = 'lowWarning' | 'midWarning' | 'highWarning';

export interface StorageWarningStage {
  key: StorageWarning;
  threshold: number;
  cooldownDays: number;
  barClassName: string;
  containerClassName?: string;
  advertisementKey?: string;
}

export const REACHING_USAGE_BANNER_TRANSLATION_KEY = 'modals.reachingUsageBanner';
export const SPECIAL_OFFER_URL = 'https://internxt.com/specialoffer';

export const STORAGE_WARNING_STAGES: StorageWarningStage[] = [
  {
    key: 'lowWarning',
    threshold: 60,
    cooldownDays: 7,
    barClassName: 'bg-yellow-60',
    containerClassName: 'pb-5',
  },
  {
    key: 'midWarning',
    threshold: 80,
    cooldownDays: 3,
    barClassName: 'bg-orange-60',
    containerClassName: 'pb-5',
    advertisementKey: `${REACHING_USAGE_BANNER_TRANSLATION_KEY}.midWarning.sidenavStorageText`,
  },
  {
    key: 'highWarning',
    threshold: 95,
    cooldownDays: 3,
    barClassName: 'bg-danger',
    containerClassName: 'pb-5 rounded-lg bg-alert border border-alert-dark',
    advertisementKey: `${REACHING_USAGE_BANNER_TRANSLATION_KEY}.highWarning.sidenavStorageText`,
  },
];

export const calculateUsedPercentage = (planUsage: number, planLimit: number): number =>
  planLimit > 0 ? (planUsage / planLimit) * 100 : 0;

export const getReachedStorageWarningStage = (usedPercentage: number): StorageWarningStage | undefined =>
  [...STORAGE_WARNING_STAGES].reverse().find((stage) => usedPercentage >= stage.threshold);

export const openUpgradeSpecialOffer = (): void => {
  window.open(SPECIAL_OFFER_URL, '_blank', 'noopener noreferrer');
};

export const readDismissals = (): StorageWarningDismissals => {
  try {
    const raw = localStorageService.get(DISMISSALS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (error) {
    console.error('Failed to read storage warning dismissals', error);
    return {};
  }
};

export const writeDismissal = (stageKey: StorageWarning, dismissedAt: number): void => {
  try {
    const dismissals = readDismissals();
    dismissals[stageKey] = dismissedAt;
    localStorageService.set(DISMISSALS_STORAGE_KEY, JSON.stringify(dismissals));
  } catch (error) {
    console.error('Failed to write storage warning dismissal', error);
  }
};

export const isStageInCooldown = (
  stage: StorageWarningStage,
  dismissals: StorageWarningDismissals,
  now: number,
): boolean => {
  const dismissedAt = dismissals[stage.key];
  if (!dismissedAt) return false;
  return now < dismissedAt + stage.cooldownDays * DAY_IN_MS;
};

export type StorageWarningDismissals = Partial<Record<StorageWarning, number>>;
