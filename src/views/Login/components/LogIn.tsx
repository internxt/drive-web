import { auth } from '@internxt/lib';
import QueryString from 'qs';
import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import localStorageService from 'app/core/services/local-storage.service';
import { twoFactorRegexPattern } from 'app/core/services/validation.service';
import { RootState } from 'app/store';
import { useAppDispatch } from 'app/store/hooks';
import { userActions } from 'app/store/slices/user';
import authService, { authenticateUser, is2FANeeded } from 'services/auth.service';

import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Button } from '@internxt/ui';
import { WarningCircle } from '@phosphor-icons/react';
import { useOAuthFlow } from 'views/Login/hooks/useOAuthFlow';
import errorService from 'app/core/services/error.service';
import navigationService from 'app/core/services/navigation.service';
import AppError, { AppView, IFormValues } from 'app/core/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import workspacesService from 'app/core/services/workspace.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import useLoginRedirections from '../hooks/useLoginRedirections';
import shareService from 'app/share/services/share.service';
import PasswordInput from 'common/components/PasswordInput';
import TextInput from 'common/components/TextInput';
import { AuthMethodTypes } from 'views/Checkout/types';
import vpnAuthService from 'services/vpnAuth.service';
import envService from 'app/core/services/env.service';

const showNotification = ({ text, isError }: { text: string; isError: boolean }) => {
  notificationsService.show({
    text,
    type: isError ? ToastType.Error : ToastType.Success,
  });
};

export default function LogIn(): JSX.Element {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const urlParams = new URLSearchParams(globalThis.location.search);

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [loginError, setLoginError] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);

  const user = useSelector((state: RootState) => state.user.user) as UserSettings;
  const mnemonic = localStorageService.get('xMnemonic');

  const {
    isUniversalLinkMode,
    isSharingInvitation,
    redirectWithCredentials,
    handleShareInvitation,
    handleWorkspaceInvitation,
    isAuthOrigin,
  } = useLoginRedirections({
    navigateTo(viewId, queryMap) {
      navigationService.push(viewId, queryMap);
    },
    processInvitation: shareService.processInvitation,
    processWorkspaceInvitation: workspacesService.processInvitation,
    showNotification,
  });

  const { isOAuthFlow, handleOAuthSuccess } = useOAuthFlow({
    authOrigin: isAuthOrigin,
  });

  useEffect(() => {
    handleShareInvitation();
    handleWorkspaceInvitation(dispatch);
  }, []);

  useEffect(() => {
    if (autoSubmit.enabled && autoSubmit.credentials) {
      onSubmit(getValues());
    }
  }, []);

  useEffect(() => {
    if (user && mnemonic && !isOAuthFlow) {
      dispatch(userActions.setUser(user));
      redirectWithCredentials(
        user,
        mnemonic,
        isUniversalLinkMode || isSharingInvitation
          ? { universalLinkMode: isUniversalLinkMode, isSharingInvitation }
          : undefined,
      );
    }
  }, []);

  const autoSubmit = useMemo(
    () => authService.extractOneUseCredentialsForAutoSubmit(new URLSearchParams(globalThis.location.search)),
    [],
  );

  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    control,
    getValues,
  } = useForm<IFormValues>({
    mode: 'onChange',
    defaultValues: autoSubmit.enabled
      ? {
          email: autoSubmit.credentials?.email,
          password: autoSubmit.credentials?.password,
        }
      : undefined,
  });

  const twoFactorCode = useWatch({
    control,
    name: 'twoFactorCode',
    defaultValue: '',
  });

  const sendUnblockAccountEmail = async (email: string) => {
    try {
      await authService.requestUnblockAccount(email);
    } catch (error) {
      errorService.reportError(error);
    }
  };

  const handleAuthenticationError = async (err: unknown, email: string): Promise<void> => {
    const castedError = errorService.castError(err);

    if (castedError.message.includes('not activated') && auth.isValidEmail(email)) {
      const emailEncoded = encodeURIComponent(email);
      navigationService.history.push(`/activate/${emailEncoded}`);
      return;
    }

    setLoginError([castedError.message]);
    setShowErrors(true);

    if ((err as AppError)?.status === 403) {
      await sendUnblockAccountEmail(email);
      navigationService.history.push({
        pathname: AppView.BlockedAccount,
        search: QueryString.stringify({ email }),
      });
    }
  };

  const handleSuccessfulAuth = (token: string, user: UserSettings, mnemonic: string): void => {
    const newToken = localStorageService.get('xNewToken');

    if (isOAuthFlow && newToken) {
      const success = handleOAuthSuccess(user, newToken);
      if (!success) {
        setIsLoggingIn(false);
        const errorMessage = translate('auth.login.failedToSendAuthData');
        setLoginError([errorMessage]);
        setShowErrors(true);
      }
      return;
    }

    const redirectUrl = authService.getRedirectUrl(urlParams, token);

    if (redirectUrl && !isUniversalLinkMode && !isSharingInvitation) {
      globalThis.location.replace(redirectUrl);
    }

    const isVPNAuth = urlParams.get('vpnAuth');
    if (isVPNAuth && newToken) {
      vpnAuthService.logIn(newToken);
    }

    redirectWithCredentials(user, mnemonic, { universalLinkMode: isUniversalLinkMode, isSharingInvitation });
  };

  const onSubmit: SubmitHandler<IFormValues> = async (formData, event) => {
    event?.preventDefault();
    setIsLoggingIn(true);
    const { email, password } = formData;

    try {
      const isTfaEnabled = await is2FANeeded(email);

      if (!isTfaEnabled || showTwoFactor) {
        const loginType: 'desktop' | 'web' = isUniversalLinkMode ? 'desktop' : 'web';
        const authParams = {
          email,
          password,
          authMethod: 'signIn' as AuthMethodTypes,
          twoFactorCode,
          dispatch,
          loginType,
        };

        const { token, user, mnemonic } = await authenticateUser(authParams);
        handleSuccessfulAuth(token, user, mnemonic);
      } else {
        setShowTwoFactor(true);
        setLoginError([]);
        setShowErrors(false);
      }
    } catch (err: unknown) {
      await handleAuthenticationError(err, email);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const getSignupLink = () => {
    const currentParams = new URLSearchParams(globalThis.location.search);

    return currentParams.toString() ? '/new?' + currentParams.toString() : '/new';
  };

  return (
    <>
      <Helmet>
        <link rel="canonical" href={`${envService.getVariable('hostname')}/login`} />
      </Helmet>
      <div className="flex h-fit w-96 flex-col items-start justify-center space-y-5 px-8 py-10">
        <h1 data-cy="loginTitle" className="text-3xl font-medium">
          {translate('auth.login.title')}
        </h1>

        <form data-cy="loginWrapper" className="flex w-full flex-col space-y-2" onSubmit={handleSubmit(onSubmit)}>
          <TextInput
            placeholder={translate('auth.email')}
            inputDataCy="emailInput"
            label="email"
            type="email"
            register={register}
            minLength={{ value: 1, message: 'Email must not be empty' }}
            error={errors.email}
          />

          <PasswordInput
            placeholder={translate('auth.password')}
            inputDataCy="passwordInput"
            label="password"
            register={register}
            required={true}
            minLength={{ value: 1, message: 'Password must not be empty' }}
            error={errors.password}
          />

          {showTwoFactor && (
            <PasswordInput
              label="twoFactorCode"
              placeholder={translate('auth.login.twoFactorAuthenticationCode')}
              error={errors.twoFactorCode}
              register={register}
              required={true}
              minLength={1}
              pattern={twoFactorRegexPattern}
            />
          )}

          {loginError && showErrors && (
            <div className="flex flex-row items-start pt-1">
              <div className="flex h-5 flex-row items-center">
                <WarningCircle weight="fill" className="mr-1 h-4 text-red" />
              </div>
              <span className="font-base w-56 text-sm text-red">{loginError}</span>
            </div>
          )}
          <Button
            type="submit"
            loading={isLoggingIn}
            buttonDataCy="loginButton"
            variant="primary"
            disabled={isLoggingIn}
          >
            {isLoggingIn && isValid ? translate('auth.decrypting') : translate('auth.login.title')}
          </Button>
        </form>

        <Link
          onClick={(): void => {
            // analyticsService.trackUserResetPasswordRequest();
          }}
          to="/recovery-link"
          className="w-full cursor-pointer appearance-none text-center font-medium text-primary no-underline hover:text-primary focus:text-primary-dark"
        >
          {translate('auth.login.forgotPwd')}
        </Link>

        <div className="w-full border-b border-gray-10" />

        <div className="flex w-full items-center justify-center space-x-1.5 font-medium">
          <span>{translate('auth.login.dontHaveAccount')}</span>
          <Link
            to={getSignupLink()}
            className="cursor-pointer appearance-none text-center text-primary no-underline hover:text-primary focus:text-primary-dark"
          >
            {translate('auth.login.createAccount')}
          </Link>
        </div>
      </div>
    </>
  );
}
