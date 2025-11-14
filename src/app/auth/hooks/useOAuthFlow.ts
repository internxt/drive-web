import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import localStorageService from 'app/core/services/local-storage.service';
import { useEffect } from 'react';
import oauthService from '../services/oauth.service';

interface UseOAuthFlowParams {
  authOrigin: string | null;
}

interface UseOAuthFlowReturn {
  isOAuthFlow: boolean;
  handleOAuthSuccess: (user: UserSettings, newToken: string) => boolean;
}

export const useOAuthFlow = ({ authOrigin }: UseOAuthFlowParams): UseOAuthFlowReturn => {
  const isOAuthFlow = !!authOrigin;

  useEffect(() => {
    if (isOAuthFlow) {
      const user = localStorageService.getUser();
      const newToken = localStorageService.get('xNewToken');

      if (user && newToken) {
        oauthService.sendAuthSuccess(user, newToken);
      }
    }
  }, [isOAuthFlow]);

  const handleOAuthSuccess = (user: UserSettings, newToken: string): boolean => {
    return oauthService.sendAuthSuccess(user, newToken);
  };

  return {
    isOAuthFlow,
    handleOAuthSuccess,
  };
};
