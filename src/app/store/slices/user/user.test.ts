import { beforeEach, describe, expect, it, vi, afterEach, test } from 'vitest';
import { RootState } from 'app/store';
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

import {
  refreshUserThunk,
  refreshAvatarThunk,
  getUserTierFeaturesThunk,
  userActions,
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

  let getStateWithUser: () => RootState;
  let dispatchMock: ReturnType<typeof vi.fn>;
  let store: ReturnType<typeof createTestStore>;

  const createTestStore = () => {
    return configureStore({
      reducer: {
        user: userReducer,
      },
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();

    const state: Partial<RootState> = {
      user: {
        isAuthenticated: true,
        isInitializing: false,
        isInitialized: true,
        user: baseUser as UserSettings,
      },
    };
    getStateWithUser = () => state as RootState;
    dispatchMock = vi.fn();

    store = createTestStore();

    const futureExp = Math.floor(Date.now() / 1000) + 60 * 60; // +1 hour
    const base64 = (str: string) => (typeof btoa === 'function' ? btoa(str) : Buffer.from(str).toString('base64'));
    const payloadB64 = base64(JSON.stringify({ exp: futureExp }));
    const validToken = `aaa.${payloadB64}.bbb`;
    vi.spyOn(localStorageService, 'get').mockReturnValue(validToken);

    vi.mocked(refreshAvatar).mockResolvedValue(null);

    vi.spyOn(errorService, 'reportError').mockImplementation(() => {});

    vi.spyOn(userService, 'refreshUserData').mockResolvedValue({
      user: baseUser as UserSettings,
      newToken: 'token',
      oldToken: 'old-token',
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('refreshUserThunk', () => {
    it('does nothing when token not expired and no forceRefresh', async () => {
      const refreshUserDataSpy = vi.spyOn(userService, 'refreshUserData');

      const thunk = refreshUserThunk();
      await thunk(dispatchMock, getStateWithUser, undefined);

      expect(refreshUserDataSpy).not.toHaveBeenCalled();
      expect(dispatchMock).not.toHaveBeenCalledWith(expect.objectContaining({ type: userActions.setUser.type }));
      expect(dispatchMock).not.toHaveBeenCalledWith(expect.objectContaining({ type: userActions.setToken.type }));
    });

    it('refreshes user and token when token is expired', async () => {
      const pastExp = Math.floor(Date.now() / 1000) - 60; // -1 minute (expired)
      const base64 = (str: string) => (typeof btoa === 'function' ? btoa(str) : Buffer.from(str).toString('base64'));
      const expiredPayloadB64 = base64(JSON.stringify({ exp: pastExp }));
      const expiredToken = `aaa.${expiredPayloadB64}.bbb`;
      vi.spyOn(localStorageService, 'get').mockReturnValue(expiredToken);

      const refreshed = {
        user: { emailVerified: true, name: 'Jane', lastname: 'Smith', uuid: baseUser.uuid },
        newToken: 'new-token-abc',
        oldToken: 'old-token-abc',
      } as unknown as Awaited<ReturnType<typeof userService.refreshUserData>>;

      vi.spyOn(userService, 'refreshUserData').mockResolvedValue(refreshed);
      vi.mocked(refreshAvatar).mockResolvedValue('avatar-url');

      const thunk = refreshUserThunk();
      await thunk(dispatchMock, getStateWithUser, undefined);

      expect(userService.refreshUserData).toHaveBeenCalledWith(baseUser.uuid);
      expect(refreshAvatar).toHaveBeenCalledWith(baseUser.uuid);

      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: userActions.setUser.type,
          payload: expect.objectContaining({
            uuid: baseUser.uuid,
            name: 'Jane',
            lastname: 'Smith',
            emailVerified: true,
            avatar: 'avatar-url',
          }),
        }),
      );
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: userActions.setToken.type, payload: 'new-token-abc' }),
      );
    });

    it('refreshes user and token when forceRefresh is true', async () => {
      const refreshed = {
        user: { emailVerified: true, name: 'Alice', lastname: 'Johnson', uuid: baseUser.uuid },
        newToken: 'forced-token-xyz',
        oldToken: 'old-token-xyz',
      } as unknown as Awaited<ReturnType<typeof userService.refreshUserData>>;

      vi.spyOn(userService, 'refreshUserData').mockResolvedValue(refreshed);
      vi.mocked(refreshAvatar).mockResolvedValue('forced-avatar-url');

      const thunk = refreshUserThunk({ forceRefresh: true });
      await thunk(dispatchMock, getStateWithUser, undefined);

      expect(userService.refreshUserData).toHaveBeenCalledWith(baseUser.uuid);
      expect(refreshAvatar).toHaveBeenCalledWith(baseUser.uuid);

      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: userActions.setUser.type,
          payload: expect.objectContaining({
            uuid: baseUser.uuid,
            name: 'Alice',
            lastname: 'Johnson',
            emailVerified: true,
            avatar: 'forced-avatar-url',
          }),
        }),
      );
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: userActions.setToken.type, payload: 'forced-token-xyz' }),
      );
    });

    it('reports error when refresh fails', async () => {
      vi.spyOn(userService, 'refreshUserData').mockRejectedValue(new Error('network'));

      const thunk = refreshUserThunk({ forceRefresh: true });
      await thunk(dispatchMock, getStateWithUser, undefined);

      expect(errorService.reportError).toHaveBeenCalled();
    });

    it('throws if current user is missing', async () => {
      const getStateNoUser = () => ({ user: { user: undefined } }) as unknown as RootState;
      const thunk = refreshUserThunk();
      const result = await thunk(dispatchMock, getStateNoUser, undefined);
      expect(result.type).toBe('user/refresh/rejected');
      expect((result as any).error?.message).toBe('Current user is not defined');
    });
  });

  describe('refreshAvatarThunk', () => {
    it('updates user avatar with refreshed value', async () => {
      vi.mocked(refreshAvatar).mockResolvedValue('new-avatar-url');

      const thunk = refreshAvatarThunk();
      await thunk(dispatchMock, getStateWithUser, undefined);

      expect(refreshAvatar).toHaveBeenCalledWith(baseUser.uuid);
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: userActions.setUser.type,
          payload: expect.objectContaining({ uuid: baseUser.uuid, avatar: 'new-avatar-url' }),
        }),
      );
    });

    it('throws if current user is missing', async () => {
      const getStateNoUser = () => ({ user: { user: undefined } }) as unknown as RootState;
      const thunk = refreshAvatarThunk();
      const result = await thunk(dispatchMock, getStateNoUser, undefined);
      expect(result.type).toBe('user/avatarRefresh/rejected');
      expect((result as any).error?.message).toBe('Current user is not defined');
    });

    it('reports error when refreshAvatar throws', async () => {
      vi.mocked(refreshAvatar).mockRejectedValue(new Error('avatar failed'));

      const thunk = refreshAvatarThunk();
      await thunk(dispatchMock, getStateWithUser, undefined);

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
