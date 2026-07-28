import { useState } from 'react';
import { authenticateUser, is2FANeeded, RegisterFunction } from 'services/auth.service';
import { AuthMethodTypes } from '../types';
import databaseService from 'app/database/services/database.service';
import { errorService, localStorageService, RealtimeService } from 'services';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { STATUS_CODE_ERROR } from '../constants';

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

const AUTH_ERROR_TRANSLATION_KEY = {
  invalidCredentials: 'checkout.authComponent.authError.invalidCredentials',
  twoFactorEnabled: 'checkout.authComponent.authError.twoFactorEnabled',
  emailAlreadyRegistered: 'checkout.authComponent.authError.emailAlreadyRegistered',
  accountLocked: 'checkout.authComponent.authError.accountLocked',
  tooManyAttempts: 'checkout.authComponent.authError.tooManyAttempts',
  invalidData: 'checkout.authComponent.authError.invalidData',
  serverError: 'checkout.authComponent.authError.serverError',
  unknown: 'checkout.authComponent.authError.unknown',
};

const isTwoFactorBlockingTheSignIn = async (
  email: string,
  authMethod: AuthMethodTypes,
  status?: number,
): Promise<boolean> => {
  const isFailedSignIn = authMethod === 'signIn' && status === STATUS_CODE_ERROR.UNAUTHORIZED;

  if (!isFailedSignIn) return false;

  try {
    return await is2FANeeded(email);
  } catch {
    return false;
  }
};

const getAuthErrorTranslationKey = ({
  status,
  authMethod,
  isTwoFactorEnabled,
}: {
  status?: number;
  authMethod: AuthMethodTypes;
  isTwoFactorEnabled: boolean;
}): string => {
  if (isTwoFactorEnabled) return AUTH_ERROR_TRANSLATION_KEY.twoFactorEnabled;

  const isServerOrNetworkError = status === undefined || status >= STATUS_CODE_ERROR.INTERNAL_SERVER_ERROR;
  if (isServerOrNetworkError) return AUTH_ERROR_TRANSLATION_KEY.serverError;

  switch (status) {
    case STATUS_CODE_ERROR.UNAUTHORIZED:
      return authMethod === 'signIn'
        ? AUTH_ERROR_TRANSLATION_KEY.invalidCredentials
        : AUTH_ERROR_TRANSLATION_KEY.unknown;
    case STATUS_CODE_ERROR.FORBIDDEN:
      return AUTH_ERROR_TRANSLATION_KEY.accountLocked;
    case STATUS_CODE_ERROR.USER_EXISTS:
      return AUTH_ERROR_TRANSLATION_KEY.emailAlreadyRegistered;
    case STATUS_CODE_ERROR.TOO_MANY_REQUESTS:
      return AUTH_ERROR_TRANSLATION_KEY.tooManyAttempts;
    case STATUS_CODE_ERROR.BAD_REQUEST:
      return AUTH_ERROR_TRANSLATION_KEY.invalidData;
    default:
      return AUTH_ERROR_TRANSLATION_KEY.unknown;
  }
};

export const useAuthCheckout = ({ changeAuthMethod }: Pick<AuthCheckoutProps, 'changeAuthMethod'>) => {
  const { translate } = useTranslationContext();
  const [authError, setAuthError] = useState<string | null>(null);

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
      setAuthError(null);
      return profileInfo.user;
    } catch (err) {
      errorService.reportError(err);
      const { status } = errorService.castError(err);
      const isTwoFactorEnabled = await isTwoFactorBlockingTheSignIn(email, authMethod, status);

      setAuthError(translate(getAuthErrorTranslationKey({ status, authMethod, isTwoFactorEnabled })));
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
