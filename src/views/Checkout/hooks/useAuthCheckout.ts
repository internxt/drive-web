import { useEffect, useState } from 'react';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { authenticateUser, RegisterFunction } from 'services/auth.service';
import { AuthMethodTypes } from '../types';
import databaseService from 'app/database/services/database.service';
import { localStorageService, RealtimeService } from 'services';

export interface AuthCheckoutProps {
  email: string;
  password: string;
  authMethod: AuthMethodTypes;
  dispatch: any;
  authCaptcha: string;
  doRegister: RegisterFunction;
  onAuthenticationFail: () => void;
  changeAuthMethod: (authMethod: AuthMethodTypes) => void;
}

interface UseAuthCheckoutProps extends Pick<AuthCheckoutProps, 'changeAuthMethod'> {
  isAuthenticated?: boolean;
  user?: UserSettings;
}

export const useAuthCheckout = ({ changeAuthMethod, isAuthenticated, user }: UseAuthCheckoutProps) => {
  const [authError, setAuthError] = useState<string | null>();

  useEffect(() => {
    if (isAuthenticated && user) {
      changeAuthMethod('userIsSignedIn');
    }
  }, [isAuthenticated, user]);

  const onAuthenticateUser = async ({
    email,
    password,
    authMethod,
    dispatch,
    authCaptcha,
    doRegister,
    onAuthenticationFail,
  }: Omit<AuthCheckoutProps, 'changeAuthMethod'>) => {
    try {
      const profileInfo = await authenticateUser({
        email,
        password,
        authMethod,
        twoFactorCode: '',
        dispatch,
        token: authCaptcha,
        doSignUp: doRegister,
      });
      return profileInfo.user;
    } catch (err) {
      const error = err as Error;
      setAuthError(error.message);
      onAuthenticationFail();
      return;
    }
  };

  const onLogOut = async () => {
    await databaseService.clear();
    localStorageService.clear();
    RealtimeService.getInstance().stop();
    changeAuthMethod('signUp');
  };

  return {
    authError,
    onAuthenticateUser,
    onLogOut,
  };
};
