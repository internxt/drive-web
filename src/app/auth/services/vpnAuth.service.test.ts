// vpnAuthService.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { logIn, logOut, postMessageToVpn } from './vpnAuth.service';

describe('Tests for VPN auth', () => {
  const originalPostMessage = window.postMessage;
  let postMessageSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    process.env.REACT_APP_HOSTNAME = 'https://example.com';
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
        process.env.REACT_APP_HOSTNAME,
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
        process.env.REACT_APP_HOSTNAME,
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
        process.env.REACT_APP_HOSTNAME,
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
        process.env.REACT_APP_HOSTNAME,
      );
    });
  });
});
