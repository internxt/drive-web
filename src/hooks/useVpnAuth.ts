import { useCallback, useEffect, useState, useRef } from 'react';
import vpnAuthService from 'app/auth/services/vpnAuth.service';

const useVpnAuth = (isVpnAuth: boolean, newToken: string | null) => {
  const [isVpnAuthNeeded, setIsVpnAuthNeeded] = useState(false);
  const hasLoggedIn = useRef(false);
  const listenerRegistered = useRef(false);

  const handleMessage = useCallback((event: MessageEvent) => {
    if (event.data?.source === 'drive-extension' && event.data?.tokenStatus === 'token-not-found') {
      setIsVpnAuthNeeded(true);
    }
  }, []);

  useEffect(() => {
    if (isVpnAuth && newToken && !listenerRegistered.current) {
      window.addEventListener('message', handleMessage);
      listenerRegistered.current = true;

      return () => {
        window.removeEventListener('message', handleMessage);
        listenerRegistered.current = false;
      };
    }
  }, [isVpnAuth, newToken, handleMessage]);

  useEffect(() => {
    if (isVpnAuthNeeded && newToken && !hasLoggedIn.current) {
      hasLoggedIn.current = true;

      const doLogin = () => {
        vpnAuthService.logIn(newToken);
      };

      if (document.readyState === 'complete') {
        doLogin();
      } else {
        window.addEventListener('load', doLogin, { once: true });
      }

      setIsVpnAuthNeeded(false);
    }
  }, [isVpnAuthNeeded, newToken]);
};

export default useVpnAuth;
