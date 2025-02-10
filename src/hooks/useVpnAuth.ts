import { useEffect, useState } from 'react';
import authService from 'app/auth/services/auth.service';
import localStorageService from 'app/core/services/local-storage.service';

const useVpnAuthIfUserIsLoggedIn = () => {
  const params = new URLSearchParams(window.location.search);
  const isVpnAuth = params.get('vpnAuth') === 'true';
  const newToken = localStorageService.get('xNewToken');

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
  }, [isVpnAuthNeeded]);

  const handleVpnAuth = () => {
    if (!newToken) return;
    authService.vpnExtensionAuth(newToken);
  };
};

export default useVpnAuthIfUserIsLoggedIn;
