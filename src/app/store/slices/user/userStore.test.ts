import { beforeEach, describe, expect, test, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import userReducer, { getUserTierFeaturesThunk } from './index';
import { ProductService, UserTierFeatures } from 'app/payment/services/products.service';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';

const MOCK_TRANSLATION_MESSAGE = 'Some features may be unavailable';

vi.mock('i18next', () => ({ t: () => MOCK_TRANSLATION_MESSAGE }));

describe('User reducer', () => {
  let store: ReturnType<typeof createTestStore>;

  const createTestStore = () => {
    return configureStore({
      reducer: {
        user: userReducer,
      },
    });
  };

  beforeEach(() => {
    store = createTestStore();
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('Get user tier thunk', () => {
    test('When getting user tier features successfully, then the features are stored in the state', async () => {
      const mockUserFeatures: UserTierFeatures = {
        drive: {
          enabled: true,
          maxSpaceBytes: 10000,
          workspaces: {
            enabled: false,
            maximumSeats: 5,
            maxSpaceBytesPerSeat: 1000,
            minimumSeats: 1,
          },
          passwordProtectedSharing: {
            enabled: true,
          },
          restrictedItemsSharing: {
            enabled: true,
          },
        },
      } as any;

      const getAvailableUserFeaturesSpy = vi
        .spyOn(ProductService.instance, 'getAvailableUserFeatures')
        .mockResolvedValue(mockUserFeatures);

      await store.dispatch(getUserTierFeaturesThunk() as any);

      expect(getAvailableUserFeaturesSpy).toHaveBeenCalledTimes(1);
      expect(store.getState().user.userTierFeatures).toEqual(mockUserFeatures);
    });

    test('When getting user tier features fails, then a warning notification is displayed', async () => {
      const mockError = new Error('Failed to fetch features');

      const getAvailableUserFeaturesSpy = vi
        .spyOn(ProductService.instance, 'getAvailableUserFeatures')
        .mockRejectedValue(mockError);
      const notificationsServiceSpy = vi.spyOn(notificationsService, 'show');

      await store.dispatch(getUserTierFeaturesThunk() as any);

      expect(getAvailableUserFeaturesSpy).toHaveBeenCalledTimes(1);
      expect(notificationsServiceSpy).toHaveBeenCalledWith({
        text: MOCK_TRANSLATION_MESSAGE,
        type: ToastType.Warning,
      });
      expect(store.getState().user.userTierFeatures).toBeUndefined();
    });
  });
});
