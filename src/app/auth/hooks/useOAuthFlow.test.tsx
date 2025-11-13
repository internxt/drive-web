import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { renderHook } from '@testing-library/react';
import localStorageService from 'app/core/services/local-storage.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as oauthService from '../services/oauth.service';
import { useOAuthFlow } from './useOAuthFlow';

const mockUserSettings: UserSettings = {
  userId: 'user_123',
  uuid: 'uuid-1234-5678',
  email: 'test.user@example.com',
  name: 'Test',
  lastname: 'User',
  username: 'testuser',
  bridgeUser: 'bridge_user',
  bucket: 'user-bucket',
  backupsBucket: 'backups-bucket',
  root_folder_id: 1,
  rootFolderId: 'folder-id-123',
  rootFolderUuid: 'folder-uuid-456',
  sharedWorkspace: false,
  credit: 100,
  mnemonic: 'test mnemonic phrase',
  privateKey: 'private-key-mock',
  publicKey: 'public-key-mock',
  revocationKey: 'revocation-key-mock',
  keys: {
    ecc: {
      publicKey: 'ecc-public-key-mock',
      privateKey: 'ecc-private-key-mock',
    },
    kyber: {
      publicKey: 'kyber-public-key-mock',
      privateKey: 'kyber-private-key-mock',
    },
  },
  appSumoDetails: null,
  registerCompleted: true,
  hasReferralsProgram: true,
  createdAt: new Date('2023-06-01T12:00:00.000Z'),
  avatar: null,
  emailVerified: true,
};

vi.mock('../services/oauth.service');

const mockSendAuthSuccess = vi.mocked(oauthService.sendAuthSuccess);

describe('useOAuthFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isOAuthFlow property', () => {
    it('should return true when authOrigin is provided', () => {
      const { result } = renderHook(() => useOAuthFlow({ authOrigin: 'https://meet.internxt.com' }));

      expect(result.current.isOAuthFlow).toBe(true);
    });

    it('should return false when authOrigin is null', () => {
      const { result } = renderHook(() => useOAuthFlow({ authOrigin: null }));

      expect(result.current.isOAuthFlow).toBe(false);
    });
  });

  describe('when the hook mounts', () => {
    it('should automatically send auth success when isOAuthFlow is true and all credentials exist', () => {
      const mockNewToken = 'test-new-token';

      vi.spyOn(localStorageService, 'getUser').mockReturnValue(mockUserSettings);
      vi.spyOn(localStorageService, 'get').mockImplementation((key: string) => {
        if (key === 'xNewToken') return mockNewToken;
        return null;
      });
      mockSendAuthSuccess.mockReturnValue(true);

      renderHook(() => useOAuthFlow({ authOrigin: 'https://meet.internxt.com' }));

      expect(localStorageService.getUser).toHaveBeenCalled();
      expect(localStorageService.get).toHaveBeenCalledWith('xNewToken');
      expect(mockSendAuthSuccess).toHaveBeenCalledWith(mockUserSettings, mockNewToken);
    });

    it('should not send auth success when isOAuthFlow is false', () => {
      const mockNewToken = 'test-new-token';

      vi.spyOn(localStorageService, 'getUser').mockReturnValue(mockUserSettings);
      vi.spyOn(localStorageService, 'get').mockImplementation((key: string) => {
        if (key === 'xNewToken') return mockNewToken;
        return null;
      });

      renderHook(() => useOAuthFlow({ authOrigin: null }));

      expect(localStorageService.getUser).not.toHaveBeenCalled();
      expect(mockSendAuthSuccess).not.toHaveBeenCalled();
    });
  });

  describe('handleOAuthSuccess method', () => {
    it('should send user credentials to the OAuth service and return true on success', () => {
      const mockNewToken = 'test-new-token';
      mockSendAuthSuccess.mockReturnValue(true);

      vi.spyOn(localStorageService, 'getUser').mockReturnValue(null);

      const { result } = renderHook(() => useOAuthFlow({ authOrigin: 'https://meet.internxt.com' }));

      const returnValue = result.current.handleOAuthSuccess(mockUserSettings, mockNewToken);

      expect(mockSendAuthSuccess).toHaveBeenCalledWith(mockUserSettings, mockNewToken);
      expect(mockSendAuthSuccess).toHaveBeenCalledTimes(1);
      expect(returnValue).toBe(true);
    });

    it('should return false when the OAuth service fails to send credentials', () => {
      const mockNewToken = 'test-new-token';
      mockSendAuthSuccess.mockReturnValue(false);

      vi.spyOn(localStorageService, 'getUser').mockReturnValue(null);

      const { result } = renderHook(() => useOAuthFlow({ authOrigin: 'https://meet.internxt.com' }));

      const returnValue = result.current.handleOAuthSuccess(mockUserSettings, mockNewToken);

      expect(mockSendAuthSuccess).toHaveBeenCalledWith(mockUserSettings, mockNewToken);
      expect(mockSendAuthSuccess).toHaveBeenCalledTimes(1);
      expect(returnValue).toBe(false);
    });
  });

  describe('when calling handleOAuthSuccess multiple times', () => {
    it('should handle multiple success calls independently', () => {
      mockSendAuthSuccess.mockReturnValue(true);

      vi.spyOn(localStorageService, 'getUser').mockReturnValue(null);

      const { result } = renderHook(() => useOAuthFlow({ authOrigin: 'https://meet.internxt.com' }));

      result.current.handleOAuthSuccess(mockUserSettings, 'newToken1');
      expect(mockSendAuthSuccess).toHaveBeenCalledWith(mockUserSettings, 'newToken1');

      result.current.handleOAuthSuccess(mockUserSettings, 'newToken2');
      expect(mockSendAuthSuccess).toHaveBeenCalledWith(mockUserSettings, 'newToken2');

      expect(mockSendAuthSuccess).toHaveBeenCalledTimes(2);
    });
  });
});
