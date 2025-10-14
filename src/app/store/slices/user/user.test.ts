import { beforeEach, describe, expect, it, vi, test } from 'vitest';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { configureStore } from '@reduxjs/toolkit';

const MOCK_TRANSLATION_MESSAGE = 'Some features may be unavailable';
vi.mock('i18next', () => ({
  t: vi.fn(() => MOCK_TRANSLATION_MESSAGE),
}));

vi.mock('app/drive/services/database.service', () => ({
  canFileBeCached: vi.fn(),
  deleteDatabaseItems: vi.fn(),
  deleteDatabaseProfileAvatar: vi.fn(),
  deleteDatabaseWorkspaceAvatar: vi.fn(),
  getDatabaseFilePreviewData: vi.fn(),
  getDatabaseFileSourceData: vi.fn(),
  getDatabaseProfileAvatar: vi.fn(),
  getDatabaseWorkspaceAvatar: vi.fn(),
  updateDatabaseFilePreviewData: vi.fn(),
  updateDatabaseFileSourceData: vi.fn(),
  updateDatabaseProfileAvatar: vi.fn(),
  updateDatabaseWorkspaceAvatar: vi.fn(),
}));

vi.mock('app/utils/avatar/avatarUtils', () => ({
  refreshAvatar: vi.fn(),
}));

vi.mock('app/auth/services/user.service', () => ({
  default: {
    downloadAvatar: vi.fn(),
    refreshUserData: vi.fn(),
    refreshAvatarUser: vi.fn(),
    updateUserProfile: vi.fn(),
    updateUserAvatar: vi.fn(),
    deleteUserAvatar: vi.fn(),
  },
}));

vi.mock('app/core/services/error.service', () => {
  return {
    default: {
      castError: vi.fn().mockImplementation((e) => ({ message: e.message ?? 'Default error message' })),
      reportError: vi.fn(),
    },
  };
});

vi.mock('app/payment/services/products.service', () => {
  const mockGetAvailableUserFeatures = vi.fn();

  return {
    ProductService: {
      instance: {
        getAvailableUserFeatures: mockGetAvailableUserFeatures,
      },
    },
    fetchProducts: vi.fn(),
    UserTierFeatures: {},
  };
});

import {
  refreshUserThunk,
  refreshAvatarThunk,
  getUserTierFeaturesThunk,
  default as userReducer,
} from 'app/store/slices/user';
import localStorageService from 'app/core/services/local-storage.service';
import userService from 'app/auth/services/user.service';
import errorService from 'app/core/services/error.service';
import { ProductService, UserTierFeatures } from 'app/payment/services/products.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { refreshAvatar } from 'app/utils/avatar/avatarUtils';

describe('user thunks', () => {
  const baseUser: Partial<UserSettings> = {
    uuid: 'user-uuid-123',
    name: 'John',
    lastname: 'Doe',
    emailVerified: false,
  };

  let store: ReturnType<typeof createTestStore>;

  const createTestStore = (initialUser?: Partial<UserSettings>) => {
    return configureStore({
      reducer: {
        user: userReducer,
      },
      preloadedState: {
        user: {
          isAuthenticated: true,
          isInitializing: false,
          isInitialized: true,
          user: initialUser as UserSettings,
        },
      } as any,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    store = createTestStore(baseUser);
  });

  describe('refreshUserThunk', () => {
    it('does nothing when token not expired and no forceRefresh', async () => {
      const futureDate = Math.floor(Date.now() / 1000) + 60;
      const base64 = (str: string) => (typeof btoa === 'function' ? btoa(str) : Buffer.from(str).toString('base64'));
      const expiredPayloadB64 = base64(JSON.stringify({ exp: futureDate }));
      const validToken = `aaa.${expiredPayloadB64}.bbb`;

      vi.spyOn(localStorageService, 'get').mockReturnValue(validToken);
      const refreshUserDataSpy = vi.spyOn(userService, 'refreshUserData');

      await store.dispatch(refreshUserThunk() as any);

      expect(refreshUserDataSpy).not.toHaveBeenCalled();
    });

    it('refreshes user and token when token is expired', async () => {
      const oneMinuteAgo = Math.floor(Date.now() / 1000) - 60;
      const base64 = (str: string) => (typeof btoa === 'function' ? btoa(str) : Buffer.from(str).toString('base64'));
      const expiredPayloadB64 = base64(JSON.stringify({ exp: oneMinuteAgo }));
      const expiredToken = `aaa.${expiredPayloadB64}.bbb`;

      vi.spyOn(localStorageService, 'get').mockReturnValue(expiredToken);

      const refreshed = {
        user: { emailVerified: true, name: 'Jane', lastname: 'Smith', uuid: baseUser.uuid },
        newToken: 'new-token-abc',
        oldToken: 'old-token-abc',
      } as unknown as Awaited<ReturnType<typeof userService.refreshUserData>>;

      const refreshUserDataSpy = vi.spyOn(userService, 'refreshUserData').mockResolvedValue(refreshed);
      vi.mocked(refreshAvatar).mockResolvedValue('avatar-url');

      // Ahora sí dispatch
      await store.dispatch(refreshUserThunk() as any);

      expect(refreshUserDataSpy).toHaveBeenCalledWith(baseUser.uuid);
      expect(refreshAvatar).toHaveBeenCalledWith(baseUser.uuid);
    });

    it('refreshes user and token when forceRefresh is true', async () => {
      const refreshed = {
        user: { emailVerified: true, name: 'Alice', lastname: 'Johnson', uuid: baseUser.uuid },
        newToken: 'forced-token-xyz',
        oldToken: 'old-token-xyz',
      } as unknown as Awaited<ReturnType<typeof userService.refreshUserData>>;

      vi.spyOn(userService, 'refreshUserData').mockResolvedValue(refreshed);
      vi.mocked(refreshAvatar).mockResolvedValue('forced-avatar-url');

      await store.dispatch(refreshUserThunk({ forceRefresh: true }) as any);

      expect(userService.refreshUserData).toHaveBeenCalledWith(baseUser.uuid);
    });

    it('reports error when refresh fails', async () => {
      vi.spyOn(userService, 'refreshUserData').mockRejectedValue(new Error('network'));

      await store.dispatch(refreshUserThunk({ forceRefresh: true }) as any);

      expect(errorService.reportError).toHaveBeenCalled();
    });

    it('throws if current user is missing', async () => {
      const emptyStore = createTestStore(undefined);
      const result = await emptyStore.dispatch(refreshUserThunk() as any);

      expect(result.type).toBe('user/refresh/rejected');
      expect((result as any).error?.message).toBe('Current user is not defined');
    });
  });

  describe('refreshAvatarThunk', () => {
    it('updates user avatar with refreshed value', async () => {
      vi.mocked(refreshAvatar).mockResolvedValue('new-avatar-url');

      await store.dispatch(refreshAvatarThunk() as any);

      expect(refreshAvatar).toHaveBeenCalledWith(baseUser.uuid);
    });

    it('throws if current user is missing', async () => {
      const emptyStore = createTestStore(undefined);
      const result = await emptyStore.dispatch(refreshAvatarThunk() as any);
      expect(result.type).toBe('user/avatarRefresh/rejected');
      expect((result as any).error?.message).toBe('Current user is not defined');
    });

    it('reports error when refreshAvatar throws', async () => {
      vi.mocked(refreshAvatar).mockRejectedValue(new Error('avatar failed'));

      await store.dispatch(refreshAvatarThunk() as any);

      expect(errorService.reportError).toHaveBeenCalled();
    });
  });

  describe('Get user tier features', () => {
    test('When the features from the user tier are requested, then they are returned correctly', async () => {
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

    test('When something goes wrong while fetching the user tier features, then a notification indicating so', async () => {
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
