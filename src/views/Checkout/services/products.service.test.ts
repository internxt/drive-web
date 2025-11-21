import { Tier } from '@internxt/sdk/dist/drive/payments/types/tiers';
import { describe, expect, test, vi, beforeEach } from 'vitest';

vi.mock('app/core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(),
  },
}));

import { SdkFactory } from 'app/core/factory/sdk';
import { ProductService } from './products.service';

const mockedUserTier: Tier = {
  id: '123456789',
  productId: 'prod_123456789',
  billingType: 'lifetime',
  label: 'Essential',
  featuresPerService: {
    drive: {
      enabled: true,
      maxSpaceBytes: 10000,
      passwordProtectedSharing: {
        enabled: true,
      },
      restrictedItemsSharing: {
        enabled: true,
      },
      workspaces: {
        enabled: true,
        minimumSeats: 3,
        maximumSeats: 10,
        maxSpaceBytesPerSeat: 1000,
      },
    },
    antivirus: {
      enabled: true,
    },
    backups: {
      enabled: true,
    },
    cleaner: {
      enabled: true,
    },
    vpn: {
      enabled: true,
      featureId: 'random-uuid',
    },
    darkMonitor: {
      enabled: true,
    },
    mail: {
      enabled: true,
      addressesPerUser: 1,
    },
    meet: {
      enabled: true,
      paxPerCall: 1,
    },
  },
};

describe('Products Service', () => {
  describe('Fetching the available user features', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    test('When the available features for a given user are requested, then the list is returned', async () => {
      const mockPaymentsClient = {
        getUserTier: vi.fn().mockResolvedValue(mockedUserTier),
      };
      const mockApiInstance = {
        createPaymentsClient: vi.fn().mockResolvedValue(mockPaymentsClient),
      };
      (SdkFactory.getNewApiInstance as any).mockReturnValue(mockApiInstance);

      const userFeatures = await ProductService.instance.getAvailableUserFeatures();

      expect(userFeatures).toEqual(mockedUserTier.featuresPerService);
      expect(SdkFactory.getNewApiInstance).toHaveBeenCalledTimes(1);
      expect(mockApiInstance.createPaymentsClient).toHaveBeenCalledTimes(1);
      expect(mockPaymentsClient.getUserTier).toHaveBeenCalledTimes(1);
    });
  });
});
