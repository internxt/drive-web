import { useEffect } from 'react';
import vpnAuthService from 'app/auth/services/vpnAuth.service';

const useVpnAuth = (isVpnAuth: boolean, newToken: string | null) => {
  useEffect(() => {
    if (!newToken) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.source === 'drive-extension' && event.data?.tokenStatus === 'token-not-found') {
        console.log('[VPN/AUTH]: Sending token to extension');
        vpnAuthService.logIn(newToken);
      }
    };

    window.addEventListener('message', handleMessage);

    if (isVpnAuth) {
      console.log('[VPN/AUTH]: Initial VPN auth detected, sending token');
      vpnAuthService.logIn(newToken);
    }

    return () => window.removeEventListener('message', handleMessage);
  }, [newToken, isVpnAuth]);
};

export default useVpnAuth;
