import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import useVpnAuth from './useVpnAuth';
import vpnAuthService from 'app/auth/services/vpnAuth.service';

const newToken = 'user-token';

vi.mock('app/auth/services/vpnAuth.service', () => ({
  default: {
    logIn: vi.fn(),
    logOut: vi.fn(),
  },
}));

describe('VPN authentication management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('VPN auth is enabled', () => {
    const isVpnAuth = true;

    test('Should send token immediately when VPN auth is enabled and token exists', async () => {
      renderHook(() => useVpnAuth(isVpnAuth, newToken));

      await waitFor(() => {
        expect(vpnAuthService.logIn).toHaveBeenCalledWith(newToken);
      });
    });

    test('When the token is requested, then should be returned', async () => {
      renderHook(() => useVpnAuth(isVpnAuth, newToken));

      vi.clearAllMocks();

      act(() => {
        window.postMessage({ source: 'drive-extension', tokenStatus: 'token-not-found' }, '*');
      });

      await waitFor(() => {
        expect(vpnAuthService.logIn).toHaveBeenCalledWith(newToken);
      });
    });

    test('When there is no new token, then we should not listen to events', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      renderHook(() => useVpnAuth(isVpnAuth, null));

      expect(addEventListenerSpy).not.toHaveBeenCalledWith('message', expect.any(Function));

      act(() => {
        window.postMessage({ source: 'drive-extension', tokenStatus: 'token-not-found' }, '*');
      });

      await waitFor(() => {
        expect(vpnAuthService.logIn).not.toHaveBeenCalled();
      });
    });

    test('When the VPN has the user token, then we should not send it', async () => {
      renderHook(() => useVpnAuth(isVpnAuth, newToken));

      vi.clearAllMocks();

      act(() => {
        window.postMessage({ source: 'drive-extension', tokenStatus: 'token-found' }, '*');
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(vpnAuthService.logIn).not.toHaveBeenCalled();
    });
  });

  describe('VPN auth is disabled', () => {
    const isVpnAuth = false;

    test('When the VPN auth param is not enabled, then we should not send the token', async () => {
      renderHook(() => useVpnAuth(isVpnAuth, newToken));

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(vpnAuthService.logIn).not.toHaveBeenCalled();
    });

    test('When the VPN auth param is not enabled, then we should listen to the events in case the VPN wants the token', async () => {
      renderHook(() => useVpnAuth(isVpnAuth, newToken));

      act(() => {
        window.postMessage({ source: 'drive-extension', tokenStatus: 'token-not-found' }, '*');
      });

      await waitFor(() => {
        expect(vpnAuthService.logIn).toHaveBeenCalledWith(newToken);
      });
    });
  });

  describe('Event listener management', () => {
    test('When we are done listening to the events, then remove them correctly', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useVpnAuth(true, 'token'));

      expect(addEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));
    });
  });
});
