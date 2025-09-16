import { describe, it, expect, vi, beforeEach, beforeAll, afterAll, Mock } from 'vitest';
import { BannerManager } from './BannerManager';
import { PlanState } from '../store/slices/plan';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { RenewalPeriod } from '@internxt/sdk/dist/drive/payments/types/types';

vi.mock('../core/services/local-storage.service', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    removeItem: vi.fn(),
  },
}));

import localStorageService from '../core/services/local-storage.service';

describe('BannerManager - showFreeBanner', () => {
  const today = new Date('2025-06-01');

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(today);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  const mockUser: UserSettings = {
    userId: '1',
    uuid: 'uuid-1',
    email: 'test@example.com',
    name: 'Test',
    lastname: 'User',
    username: 'testuser',
    bridgeUser: '',
    bucket: '',
    backupsBucket: null,
    root_folder_id: 1,
    rootFolderId: 'folder',
    rootFolderUuid: 'folder-uuid',
    sharedWorkspace: false,
    credit: 0,
    mnemonic: '',
    privateKey: '',
    publicKey: '',
    revocationKey: '',
    keys: {
      ecc: { publicKey: '', privateKey: '' },
      kyber: { publicKey: '', privateKey: '' },
    },
    teams: false,
    appSumoDetails: null,
    registerCompleted: true,
    hasReferralsProgram: false,
    createdAt: today,
    avatar: null,
    emailVerified: true,
  };
  const validPlan: PlanState = {
    isLoadingPlanLimit: false,
    isLoadingPlanUsage: false,
    isLoadingBusinessLimitAndUsage: false,
    individualPlan: {
      planId: 'plan-id',
      productId: 'product-id',
      name: 'Plan',
      simpleName: 'Free',
      paymentInterval: RenewalPeriod.Monthly,
      price: 0,
      monthlyPrice: 0,
      currency: 'eur',
      isTeam: false,
      isLifetime: false,
      renewalPeriod: RenewalPeriod.Monthly,
      storageLimit: 0,
      amountOfSeats: 1,
      seats: { minimumSeats: 1, maximumSeats: 1 },
    },
    businessPlan: null,
    planLimit: 0,
    planUsage: 0,
    usageDetails: null,
    individualSubscription: { type: 'free' },
    businessSubscription: null,
    businessPlanLimit: 0,
    businessPlanUsage: 0,
    businessPlanUsageDetails: null,
  };

  const futureDate = new Date('2025-06-10');
  const expiredDate = new Date('2025-05-01');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns true for free banner when conditions are met', () => {
    (localStorageService.get as Mock).mockReturnValue('');
    const manager = new BannerManager(mockUser, validPlan, futureDate);
    const result = manager.getBannersToShow();
    expect(result.showFreeBanner).toBe(true);
  });

  it('returns false for free banner when localStorage has future date', () => {
    (localStorageService.get as Mock).mockReturnValue('2025-06-10');
    const manager = new BannerManager(mockUser, validPlan, futureDate);
    const result = manager.getBannersToShow();
    expect(result.showFreeBanner).toBe(false);
  });

  it('returns false for free banner when offer is expired', () => {
    (localStorageService.get as Mock).mockReturnValue('');
    const manager = new BannerManager(mockUser, validPlan, expiredDate);
    const result = manager.getBannersToShow();
    expect(result.showFreeBanner).toBe(false);
  });
});
