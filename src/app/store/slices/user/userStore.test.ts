import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import userReducer, { getUserTierFeaturesThunk } from './index';
import { ProductService, UserTierFeatures } from 'views/Checkout/services';
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe.skip('Get user tier thunk', () => {
    test('When getting user tier features successfully, then the features are stored in the state', async () => {
      const mockUserFeatures: Partial<UserTierFeatures> = {
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
      };

      const getAvailableUserFeaturesSpy = vi
        .spyOn(ProductService.instance, 'getAvailableUserFeatures')
        .mockResolvedValue(mockUserFeatures as UserTierFeatures);

      await store.dispatch(getUserTierFeaturesThunk() as any);

      expect(getAvailableUserFeaturesSpy).toHaveBeenCalledTimes(1);
      expect(store.getState().user.userTierFeatures).toEqual(mockUserFeatures);
    });

    test('When getting user tier features fails, then a warning notification is displayed', async () => {
      const notificationsServiceSpy = vi.spyOn(notificationsService, 'show');
      const mockError = new Error('Failed to fetch features');
      vi.spyOn(ProductService.instance, 'getAvailableUserFeatures').mockRejectedValue(mockError);

      await store.dispatch(getUserTierFeaturesThunk() as any);

      expect(notificationsServiceSpy).toHaveBeenCalledWith({
        text: MOCK_TRANSLATION_MESSAGE,
        type: ToastType.Warning,
      });
      expect(store.getState().user.userTierFeatures).toBeUndefined();
    });
  });
});
