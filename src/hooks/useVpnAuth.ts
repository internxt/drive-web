import { useCallback, useEffect, useState } from 'react';
import authService from 'app/auth/services/auth.service';

const useVpnAuth = (isVpnAuth: boolean, newToken: string | null) => {
  const [isVpnAuthNeeded, setIsVpnAuthNeeded] = useState<boolean>(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.source === 'drive-extension' && event.data?.tokenStatus === 'token-not-found' && isVpnAuth) {
        setIsVpnAuthNeeded(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (isVpnAuthNeeded && newToken) {
      window.addEventListener('message', handleVpnAuth);
    }

    return () => {
      window.removeEventListener('message', handleVpnAuth);
    };
  }, [isVpnAuthNeeded, newToken]);

  const handleVpnAuth = useCallback(() => {
    if (!newToken) return;
    authService.vpnExtensionAuth(newToken);
    setIsVpnAuthNeeded(false);
  }, [newToken]);
};

export default useVpnAuth;
