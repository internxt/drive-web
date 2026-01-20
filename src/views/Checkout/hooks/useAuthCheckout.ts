import { useState } from 'react';
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

export const useAuthCheckout = ({ changeAuthMethod }: Pick<AuthCheckoutProps, 'changeAuthMethod'>) => {
  const [authError, setAuthError] = useState<string | null>();

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
      await authenticateUser({
        email,
        password,
        authMethod,
        twoFactorCode: '',
        dispatch,
        token: authCaptcha,
        doSignUp: doRegister,
      });
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
