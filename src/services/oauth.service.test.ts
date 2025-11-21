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

describe('OAuth authentication service', () => {
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

  describe('Allowed origins configuration', () => {
    it('when origins are requested, then a safe copy of allowed domains is provided', () => {
      const origins = oauthService.getAllowedOrigins();

      expect(origins).toEqual(['https://meet.internxt.com']);
      expect(origins).not.toBe(oauthService.getAllowedOrigins());
    });
  });

  describe('Popup window context', () => {
    it('when running in a popup opened by a parent window, then popup context is detected', () => {
      Object.defineProperty(window, 'opener', {
        value: mockOpener,
        writable: true,
        configurable: true,
      });

      expect(oauthService.isOAuthPopup()).toBe(true);
    });

    it('when running in a standalone browser window, then popup context is not detected', () => {
      Object.defineProperty(window, 'opener', {
        value: null,
        writable: true,
        configurable: true,
      });

      expect(oauthService.isOAuthPopup()).toBe(false);
    });
  });

  describe('Successful authentication', () => {
    const mockNewToken = 'test-new-token';

    it('when authentication succeeds with a trusted parent window, then credentials are transmitted and popup closes', () => {
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

    it('when there is no parent window available, then transmission fails gracefully', () => {
      Object.defineProperty(window, 'opener', {
        value: null,
        writable: true,
        configurable: true,
      });

      const result = oauthService.sendAuthSuccess(mockUserSettings, mockNewToken);

      expect(result).toBe(false);
      expect(mockWindowClose).not.toHaveBeenCalled();
    });

    it('when browser blocks direct parent access, then referrer URL is used as fallback', () => {
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
  });

  describe('Pattern-based domain validation', () => {
    const mockNewToken = 'test-new-token';

    it('when parent window matches allowed domain pattern, then transmission is allowed', () => {
      const allowedPatternOpener = {
        postMessage: vi.fn(),
        location: {
          origin: 'https://ffe95a9d.meet-web.pages.dev',
        },
      };

      Object.defineProperty(window, 'opener', {
        value: allowedPatternOpener,
        writable: true,
        configurable: true,
      });

      const result = oauthService.sendAuthSuccess(mockUserSettings, mockNewToken);

      expect(result).toBe(true);
      expect(allowedPatternOpener.postMessage).toHaveBeenCalledWith(
        {
          type: OAuthMessageType.SUCCESS,
          payload: {
            mnemonic: btoa(mockUserSettings.mnemonic),
            newToken: btoa(mockNewToken),
          },
        },
        'https://ffe95a9d.meet-web.pages.dev',
      );
    });

    it('when referrer matches allowed domain pattern, then transmission is allowed', () => {
      const crossOriginOpener = {
        postMessage: vi.fn(),
        get location() {
          throw new Error('Cross-origin access denied');
        },
      };

      Object.defineProperty(document, 'referrer', {
        value: 'https://abc123.meet-web.pages.dev/login',
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
        'https://abc123.meet-web.pages.dev',
      );
    });

    it('when parent window uses HTTP instead of HTTPS, then transmission is blocked', () => {
      const httpOpener = {
        postMessage: vi.fn(),
        location: {
          origin: 'http://preview.meet-web.pages.dev',
        },
      };

      Object.defineProperty(window, 'opener', {
        value: httpOpener,
        writable: true,
        configurable: true,
      });

      const result = oauthService.sendAuthSuccess(mockUserSettings, mockNewToken);

      expect(result).toBe(false);
      expect(httpOpener.postMessage).not.toHaveBeenCalled();
    });

    it('when parent window does not match allowed domain patterns, then transmission is blocked', () => {
      const disallowedPatternOpener = {
        postMessage: vi.fn(),
        location: {
          origin: 'https://preview.other-project.pages.dev',
        },
      };

      Object.defineProperty(window, 'opener', {
        value: disallowedPatternOpener,
        writable: true,
        configurable: true,
      });

      const result = oauthService.sendAuthSuccess(mockUserSettings, mockNewToken);

      expect(result).toBe(false);
      expect(disallowedPatternOpener.postMessage).not.toHaveBeenCalled();
    });

    it('when parent window is base domain of allowed pattern, then transmission is allowed', () => {
      const baseDomainOpener = {
        postMessage: vi.fn(),
        location: {
          origin: 'https://meet-web.pages.dev',
        },
      };

      Object.defineProperty(window, 'opener', {
        value: baseDomainOpener,
        writable: true,
        configurable: true,
      });

      const result = oauthService.sendAuthSuccess(mockUserSettings, mockNewToken);

      expect(result).toBe(true);
      expect(baseDomainOpener.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: OAuthMessageType.SUCCESS,
        }),
        'https://meet-web.pages.dev',
      );
    });
  });

  describe('Security and origin validation', () => {
    const mockNewToken = 'test-new-token';

    it('when running in development and origin cannot be verified, then transmission is allowed to any domain', () => {
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

    it('when running in production and origin cannot be verified, then transmission is blocked for security', () => {
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

    it('when parent window is from an untrusted domain, then transmission is blocked', () => {
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

    it('when referrer is from an untrusted domain, then transmission is blocked', () => {
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
  });

  describe('Error handling', () => {
    const mockNewToken = 'test-new-token';

    it('when communication with parent fails, then popup remains open and failure is reported', () => {
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
