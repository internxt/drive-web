import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import localStorageService from 'app/core/services/local-storage.service';
import { useEffect } from 'react';
import oauthService from '../services/oauth.service';

interface UseOAuthFlowParams {
  authOrigin: string | null;
}

interface UseOAuthFlowReturn {
  isOAuthFlow: boolean;
  handleOAuthError: (errorMessage: string) => boolean;
  handleOAuthSuccess: (user: UserSettings, token: string, newToken: string) => boolean;
}

export const useOAuthFlow = ({ authOrigin }: UseOAuthFlowParams): UseOAuthFlowReturn => {
  const isOAuthFlow = !!authOrigin;

  useEffect(() => {
    if (isOAuthFlow) {
      const user = localStorageService.getUser();
      const token = localStorageService.get('xToken');
      const newToken = localStorageService.get('xNewToken');

      if (user && token && newToken) {
        oauthService.sendAuthSuccess(user, token, newToken);
      }
    }
  }, [isOAuthFlow]);

  const handleOAuthError = (errorMessage: string): boolean => {
    return oauthService.sendAuthError(errorMessage);
  };

  const handleOAuthSuccess = (user: UserSettings, token: string, newToken: string): boolean => {
    return oauthService.sendAuthSuccess(user, token, newToken);
  };

  return {
    isOAuthFlow,
    handleOAuthError,
    handleOAuthSuccess,
  };
};
