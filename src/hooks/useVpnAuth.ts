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
      vpnAuthService.logIn(newToken);
      setIsVpnAuthNeeded(false);
    }
  }, [isVpnAuthNeeded, newToken]);
};

export default useVpnAuth;
