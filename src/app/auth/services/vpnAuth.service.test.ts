// vpnAuthService.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { logIn, logOut, postMessageToVpn } from './vpnAuth.service';
import { envConfig } from 'app/core/services/env.service';

describe('Tests for VPN auth', () => {
  const originalPostMessage = window.postMessage;
  let postMessageSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    envConfig.app.hostname = 'https://example.com';
  });

  beforeEach(() => {
    postMessageSpy = vi.spyOn(window, 'postMessage').mockImplementation(() => {});
  });

  afterEach(() => {
    postMessageSpy.mockRestore();
  });

  afterAll(() => {
    window.postMessage = originalPostMessage;
  });

  describe('Posting messages to the VPN', () => {
    it('When no custom source is provided, then it should default to "drive-web"', () => {
      postMessageToVpn({ key: 'value' });

      expect(postMessageSpy).toHaveBeenCalledOnce();
      expect(postMessageSpy).toHaveBeenCalledWith(
        {
          source: 'drive-web',
          payload: { key: 'value' },
        },
        envConfig.app.hostname,
      );
    });

    it('When a custom source is provided, then it should use that source', () => {
      postMessageToVpn({ foo: 'bar' }, 'custom-source');

      expect(postMessageSpy).toHaveBeenCalledOnce();
      expect(postMessageSpy).toHaveBeenCalledWith(
        {
          source: 'custom-source',
          payload: { foo: 'bar' },
        },
        envConfig.app.hostname,
      );
    });
  });

  describe('The user logs in from the web app for the VPN', () => {
    it('When user wants to log in, then it should post an object with the parameters "user-token" as message and user token', () => {
      const testToken = 'test-token-value';
      logIn(testToken);

      expect(postMessageSpy).toHaveBeenCalledOnce();
      expect(postMessageSpy).toHaveBeenCalledWith(
        {
          source: 'drive-web',
          payload: {
            message: 'user-token',
            token: testToken,
          },
        },
        envConfig.app.hostname,
      );
    });
  });

  describe('The user logs out from the web app for the VPN', () => {
    it('When the user logs out in the app web, then it should post a message with "user-logged-out" to indicate the VPN that the session is closed', () => {
      logOut();

      expect(postMessageSpy).toHaveBeenCalledOnce();
      expect(postMessageSpy).toHaveBeenCalledWith(
        {
          source: 'drive-web',
          payload: {
            message: 'user-logged-out',
          },
        },
        envConfig.app.hostname,
      );
    });
  });
});
