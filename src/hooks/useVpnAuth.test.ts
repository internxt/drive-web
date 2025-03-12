import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import useVpnAuth from './useVpnAuth';
import authService from 'app/auth/services/auth.service';

const newToken = 'user-token';

vi.mock('app/auth/services/auth.service', () => ({
  default: {
    vpnExtensionAuth: vi.fn(),
  },
}));

describe('VPN authentication management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('VPN auth is enabled', () => {
    const isVpnAuth = true;

    test('When there is new token and the VPN does not have the user token, then we should listen to the events and trigger the token', async () => {
      renderHook(() => useVpnAuth(isVpnAuth, newToken));

      act(() => {
        window.postMessage({ source: 'drive-extension', tokenStatus: 'token-not-found' }, '*');
      });

      await waitFor(() => {
        expect(authService.vpnExtensionAuth).toHaveBeenCalledWith({ token: newToken, message: 'user-token' });
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
        expect(authService.vpnExtensionAuth).not.toHaveBeenCalled();
      });
    });

    test('When the VPN has the user token, then we should not send it', async () => {
      renderHook(() => useVpnAuth(isVpnAuth, newToken));

      act(() => {
        window.postMessage({ source: 'drive-extension', tokenStatus: 'token-found' }, '*');
      });

      await waitFor(() => {
        expect(authService.vpnExtensionAuth).not.toHaveBeenCalled();
      });
    });
  });

  describe('VPN auth is disabled', () => {
    const isVpnAuth = false;
    test('When the VPN auth is not enabled, then do nothing', async () => {
      renderHook(() => useVpnAuth(isVpnAuth, newToken));

      act(() => {
        window.postMessage({ source: 'drive-extension', tokenStatus: 'token-not-found' }, '*');
      });

      await waitFor(() => {
        expect(authService.vpnExtensionAuth).not.toHaveBeenCalled();
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
