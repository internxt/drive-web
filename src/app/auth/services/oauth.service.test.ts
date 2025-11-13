import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import envService from 'app/core/services/env.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as oauthService from './oauth.service';
import { OAuthMessageType } from './oauth.service';

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

describe('OAuth Service', () => {
  let mockOpener: any;
  let mockWindowClose: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    mockWindowClose = vi.fn();
    Object.defineProperty(window, 'close', {
      value: mockWindowClose,
      writable: true,
      configurable: true,
    });

    // Setup default opener
    mockOpener = {
      postMessage: vi.fn(),
      location: {
        origin: 'https://meet.internxt.com',
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAllowedOrigins method', () => {
    it('should return a new array copy of the allowed origins list', () => {
      const origins = oauthService.getAllowedOrigins();

      expect(origins).toEqual(['https://meet.internxt.com']);
      expect(origins).not.toBe(oauthService.getAllowedOrigins());
    });
  });

  describe('isOAuthPopup method', () => {
    it('should return true when the window has an opener property', () => {
      Object.defineProperty(window, 'opener', {
        value: mockOpener,
        writable: true,
        configurable: true,
      });

      expect(oauthService.isOAuthPopup()).toBe(true);
    });

    it('should return false when the window has no opener property', () => {
      Object.defineProperty(window, 'opener', {
        value: null,
        writable: true,
        configurable: true,
      });

      expect(oauthService.isOAuthPopup()).toBe(false);
    });
  });

  describe('sendAuthSuccess method', () => {
    const mockNewToken = 'test-new-token';

    it('should send authentication success to the opener window and close the popup when origin is allowed', () => {
      Object.defineProperty(window, 'opener', {
        value: mockOpener,
        writable: true,
        configurable: true,
      });

      const result = oauthService.sendAuthSuccess(mockUserSettings, mockNewToken);

      expect(result).toBe(true);
      expect(mockOpener.postMessage).toHaveBeenCalledWith(
        {
          type: OAuthMessageType.SUCCESS,
          payload: {
            mnemonic: btoa(mockUserSettings.mnemonic),
            newToken: btoa(mockNewToken),
          },
        },
        'https://meet.internxt.com',
      );
      expect(mockWindowClose).toHaveBeenCalled();
    });

    it('should return false when window.opener is not available', () => {
      Object.defineProperty(window, 'opener', {
        value: null,
        writable: true,
        configurable: true,
      });

      const result = oauthService.sendAuthSuccess(mockUserSettings, mockNewToken);

      expect(result).toBe(false);
      expect(mockWindowClose).not.toHaveBeenCalled();
    });

    it('should use document.referrer as fallback origin when opener.location throws cross-origin error', () => {
      const crossOriginOpener = {
        postMessage: vi.fn(),
        get location() {
          throw new Error('Cross-origin access denied');
        },
      };

      Object.defineProperty(document, 'referrer', {
        value: 'https://meet.internxt.com/login',
        writable: true,
        configurable: true,
      });

      Object.defineProperty(window, 'opener', {
        value: crossOriginOpener,
        writable: true,
        configurable: true,
      });

      const result = oauthService.sendAuthSuccess(mockUserSettings, mockNewToken);

      expect(result).toBe(true);
      expect(crossOriginOpener.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: OAuthMessageType.SUCCESS,
        }),
        'https://meet.internxt.com',
      );
    });

    it('should use wildcard target origin in development mode when origin cannot be determined', () => {
      const crossOriginOpener = {
        postMessage: vi.fn(),
        get location() {
          throw new Error('Cross-origin access denied');
        },
      };

      Object.defineProperty(document, 'referrer', {
        value: '',
        writable: true,
        configurable: true,
      });

      vi.spyOn(envService, 'isProduction').mockReturnValue(false);

      Object.defineProperty(window, 'opener', {
        value: crossOriginOpener,
        writable: true,
        configurable: true,
      });

      const result = oauthService.sendAuthSuccess(mockUserSettings, mockNewToken);

      expect(result).toBe(true);
      expect(crossOriginOpener.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: OAuthMessageType.SUCCESS,
        }),
        '*',
      );
    });

    it('should return false in production mode when origin cannot be determined safely', () => {
      const crossOriginOpener = {
        postMessage: vi.fn(),
        get location() {
          throw new Error('Cross-origin access denied');
        },
      };

      Object.defineProperty(document, 'referrer', {
        value: '',
        writable: true,
        configurable: true,
      });

      vi.spyOn(envService, 'isProduction').mockReturnValue(true);

      Object.defineProperty(window, 'opener', {
        value: crossOriginOpener,
        writable: true,
        configurable: true,
      });

      const result = oauthService.sendAuthSuccess(mockUserSettings, mockNewToken);

      expect(result).toBe(false);
      expect(crossOriginOpener.postMessage).not.toHaveBeenCalled();
    });

    it('should return false when opener origin is not in the allowed origins list', () => {
      const disallowedOpener = {
        postMessage: vi.fn(),
        location: {
          origin: 'https://malicious-site.com',
        },
      };

      Object.defineProperty(window, 'opener', {
        value: disallowedOpener,
        writable: true,
        configurable: true,
      });

      const result = oauthService.sendAuthSuccess(mockUserSettings, mockNewToken);

      expect(result).toBe(false);
      expect(disallowedOpener.postMessage).not.toHaveBeenCalled();
    });

    it('should return false when referrer origin is not in the allowed origins list', () => {
      const crossOriginOpener = {
        postMessage: vi.fn(),
        get location() {
          throw new Error('Cross-origin access denied');
        },
      };

      Object.defineProperty(document, 'referrer', {
        value: 'https://malicious-site.com/login',
        writable: true,
        configurable: true,
      });

      vi.spyOn(envService, 'isProduction').mockReturnValue(true);

      Object.defineProperty(window, 'opener', {
        value: crossOriginOpener,
        writable: true,
        configurable: true,
      });

      const result = oauthService.sendAuthSuccess(mockUserSettings, mockNewToken);

      expect(result).toBe(false);
      expect(crossOriginOpener.postMessage).not.toHaveBeenCalled();
    });

    it('should return false when postMessage throws an exception', () => {
      const errorOpener = {
        postMessage: vi.fn(() => {
          throw new Error('postMessage error');
        }),
        location: {
          origin: 'https://meet.internxt.com',
        },
      };

      Object.defineProperty(window, 'opener', {
        value: errorOpener,
        writable: true,
        configurable: true,
      });

      const result = oauthService.sendAuthSuccess(mockUserSettings, mockNewToken);

      expect(result).toBe(false);
      expect(mockWindowClose).not.toHaveBeenCalled();
    });
  });
});
