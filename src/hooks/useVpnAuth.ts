import { useCallback, useEffect, useState } from 'react';
import vpnAuthService from 'app/auth/services/vpnAuth.service';

const useVpnAuth = (isVpnAuth: boolean, newToken: string | null) => {
  const [isVpnAuthNeeded, setIsVpnAuthNeeded] = useState(false);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (event.data?.source === 'drive-extension' && event.data?.tokenStatus === 'token-not-found') {
        setIsVpnAuthNeeded(true);
      }
    },
    [setIsVpnAuthNeeded],
  );

  useEffect(() => {
    if (isVpnAuth && newToken) {
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [isVpnAuth, newToken, handleMessage]);

  useEffect(() => {
    if (isVpnAuthNeeded && newToken) {
      if (document.readyState === 'complete') {
        vpnAuthService.logIn(newToken);
      } else {
        window.addEventListener(
          'load',
          () => {
            console.log('[VPN/AUTH]: Window load event fired, now logging in');
            vpnAuthService.logIn(newToken);
          },
          { once: true },
        );
      }
      setIsVpnAuthNeeded(false);
    }
  }, [isVpnAuthNeeded, newToken]);
};

export default useVpnAuth;
