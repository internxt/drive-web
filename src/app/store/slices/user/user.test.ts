/**
 * @jest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RootState } from 'app/store';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

import { vi as _vi } from 'vitest';
_vi.mock('app/drive/services/database.service', () => ({
  updateDatabaseProfileAvatar: _vi.fn(),
  deleteDatabaseProfileAvatar: _vi.fn(),
}));

import { refreshUserThunk, refreshAvatarThunk, userActions } from 'app/store/slices/user';
import localStorageService from 'app/core/services/local-storage.service';
import userService from 'services/user.service';
import errorService from 'app/core/services/error.service';

describe('user thunks', () => {
  const baseUser: Partial<UserSettings> = {
    uuid: 'user-uuid-123',
    name: 'John',
    lastname: 'Doe',
    emailVerified: false,
  };

  let getStateWithUser: () => RootState;
  let dispatchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
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

    const futureExp = Math.floor(Date.now() / 1000) + 60 * 60; // +1 hour
    const base64 = (str: string) => (typeof btoa === 'function' ? btoa(str) : Buffer.from(str).toString('base64'));
    const payloadB64 = base64(JSON.stringify({ exp: futureExp }));
    const validToken = `aaa.${payloadB64}.bbb`;
    vi.spyOn(localStorageService, 'get').mockReturnValue(validToken);

    vi.spyOn(userService, 'refreshAvatarUser').mockResolvedValue({ avatar: null });

    vi.spyOn(errorService, 'reportError').mockImplementation(() => {});
  });

  describe('refreshUserThunk', () => {
    it('does nothing when token not expired and no forceRefresh', async () => {
      vi.spyOn(userService, 'refreshUserData');

      const thunk = refreshUserThunk();
      await thunk(dispatchMock, getStateWithUser, undefined);

      expect(userService.refreshUserData).not.toHaveBeenCalled();
      expect(dispatchMock).not.toHaveBeenCalledWith(expect.objectContaining({ type: userActions.setUser.type }));
      expect(dispatchMock).not.toHaveBeenCalledWith(expect.objectContaining({ type: userActions.setToken.type }));
    });

    it('refreshes user and token when forced', async () => {
      const refreshed = {
        user: { emailVerified: true, name: 'Jane', lastname: 'Smith', uuid: baseUser.uuid },
        newToken: 'new-token-abc',
        oldToken: 'old-token-abc',
      } as unknown as Awaited<ReturnType<typeof userService.refreshUserData>>;
      vi.spyOn(userService, 'refreshUserData').mockResolvedValue(refreshed);
      vi.spyOn(userService, 'refreshAvatarUser').mockResolvedValue({ avatar: 'avatar-url' });
      vi.spyOn(userService, 'downloadAvatar').mockResolvedValue(new Blob(['x']));

      const thunk = refreshUserThunk({ forceRefresh: true });
      await thunk(dispatchMock, getStateWithUser, undefined);

      expect(userService.refreshUserData).toHaveBeenCalledWith(baseUser.uuid);
      expect(userService.refreshAvatarUser).toHaveBeenCalled();

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

    it('still refreshes when forceRefresh is true (independent of token)', async () => {
      const refreshed = {
        user: { emailVerified: true, name: 'Alice', lastname: 'Johnson', uuid: baseUser.uuid },
        newToken: 'forced-token-xyz',
        oldToken: 'old-token-xyz',
      } as unknown as Awaited<ReturnType<typeof userService.refreshUserData>>;
      vi.spyOn(userService, 'refreshUserData').mockResolvedValue(refreshed);
      vi.spyOn(userService, 'refreshAvatarUser').mockResolvedValue({ avatar: 'forced-avatar-url' });
      vi.spyOn(userService, 'downloadAvatar').mockResolvedValue(new Blob(['y']));

      const thunk = refreshUserThunk({ forceRefresh: true });
      await thunk(dispatchMock, getStateWithUser, undefined);

      expect(userService.refreshUserData).toHaveBeenCalledWith(baseUser.uuid);
      expect(userService.refreshAvatarUser).toHaveBeenCalled();

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
      vi.spyOn(userService, 'refreshAvatarUser').mockResolvedValue({ avatar: 'new-avatar-url' });
      vi.spyOn(userService, 'downloadAvatar').mockResolvedValue(new Blob(['z']));

      const thunk = refreshAvatarThunk();
      await thunk(dispatchMock, getStateWithUser, undefined);

      expect(userService.refreshAvatarUser).toHaveBeenCalled();
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
      vi.spyOn(userService, 'refreshAvatarUser').mockRejectedValue(new Error('avatar failed'));

      const thunk = refreshAvatarThunk();
      await thunk(dispatchMock, getStateWithUser, undefined);

      expect(errorService.reportError).toHaveBeenCalled();
    });
  });
});
