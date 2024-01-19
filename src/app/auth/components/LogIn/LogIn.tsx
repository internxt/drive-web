import { useEffect, useMemo, useState } from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import { auth } from '@internxt/lib';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

import { initializeUserThunk, userActions } from 'app/store/slices/user';
import { RootState } from 'app/store';
import { useAppDispatch } from 'app/store/hooks';
import { twoFactorRegexPattern } from 'app/core/services/validation.service';
import authService, { is2FANeeded, doLogin } from '../../services/auth.service';
import localStorageService from 'app/core/services/local-storage.service';

import { WarningCircle } from '@phosphor-icons/react';
import { planThunks } from 'app/store/slices/plan';
import { productsThunks } from 'app/store/slices/products';
import errorService from 'app/core/services/error.service';
import { AppView, IFormValues } from 'app/core/types';
import navigationService from 'app/core/services/navigation.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import TextInput from '../TextInput/TextInput';
import PasswordInput from '../PasswordInput/PasswordInput';
import { referralsThunks } from 'app/store/slices/referrals';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import shareService from '../../../share/services/share.service';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import Button from 'app/shared/components/Button/Button';

export default function LogIn(): JSX.Element {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const urlParams = new URLSearchParams(window.location.search);

  const sharingId = urlParams.get('sharingId');
  const folderuuidToRedirect = urlParams.get('folderuuid');

  const sharingToken = urlParams.get('token');
  const sharingAction = urlParams.get('action');
  const isSharingInvitation = !!sharingId;
  const isUniversalLinkMode = urlParams.get('universalLink') === 'true';

  const autoSubmit = useMemo(
    () => authService.extractOneUseCredentialsForAutoSubmit(new URLSearchParams(window.location.search)),
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
  const email = useWatch({ control, name: 'email', defaultValue: '' });
  const twoFactorCode = useWatch({
    control,
    name: 'twoFactorCode',
    defaultValue: '',
  });
  const mnemonic = localStorageService.get('xMnemonic');

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [loginError, setLoginError] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const user = useSelector((state: RootState) => state.user.user) as UserSettings;

  useEffect(() => {
    if (autoSubmit.enabled && autoSubmit.credentials) {
      onSubmit(getValues());
    }

    if (isSharingInvitation && sharingId && sharingToken) {
      const isDeclineAction = sharingAction === 'decline';

      shareService
        .processInvitation(isDeclineAction, sharingId, sharingToken)
        .then(() => {
          navigationService.push(AppView.Login);
          notificationsService.show({
            text: isDeclineAction
              ? translate('modals.shareModal.invite.declinedSuccessfully')
              : translate('modals.shareModal.invite.acceptedSuccessfully'),
            type: ToastType.Success,
          });
        })
        .catch(() =>
          notificationsService.show({
            text: isDeclineAction
              ? translate('modals.shareModal.invite.error.declinedError')
              : translate('modals.shareModal.invite.error.acceptedError'),
            type: ToastType.Error,
          }),
        );
    }
  }, []);

  const redirectWithCredentials = (
    user: UserSettings,
    mnemonic: string,
    options?: { universalLinkMode: boolean; isSharingInvitation: boolean },
  ) => {
    if (folderuuidToRedirect) {
      return navigationService.push(AppView.Shared, { folderuuid: folderuuidToRedirect });
    }

    if (user.registerCompleted === false) {
      return navigationService.history.push('/appsumo/' + user.email);
    }

    if (user?.registerCompleted && mnemonic && options?.isSharingInvitation) {
      return navigationService.push(AppView.Shared);
    }

    if (user?.registerCompleted && mnemonic && !options?.universalLinkMode) {
      return navigationService.push(AppView.Drive);
    }

    // This is a redirect for universal link for Desktop MacOS
    if (user?.registerCompleted && mnemonic && options?.universalLinkMode) {
      return navigationService.push(AppView.UniversalLinkSuccess);
    }
  };

  const onSubmit: SubmitHandler<IFormValues> = async (formData, event) => {
    event?.preventDefault();
    setIsLoggingIn(true);
    const { email, password } = formData;

    try {
      const isTfaEnabled = await is2FANeeded(email);

      if (!isTfaEnabled || showTwoFactor) {
        const loginType = isUniversalLinkMode ? 'desktop' : 'web';
        const { token, user, mnemonic } = await doLogin(email, password, twoFactorCode, loginType);
        dispatch(userActions.setUser(user));

        window.rudderanalytics.identify(user.uuid, { email: user.email, uuid: user.uuid });
        window.rudderanalytics.track('User Signin', { email: user.email });
        window.gtag('event', 'User Signin', { method: 'email' });

        try {
          dispatch(productsThunks.initializeThunk());
          dispatch(planThunks.initializeThunk());
          dispatch(referralsThunks.initializeThunk());
          await dispatch(initializeUserThunk()).unwrap();
        } catch (e: unknown) {
          // PASS
        }

        userActions.setUser(user);

        const redirectUrl = authService.getRedirectUrl(urlParams, token);

        if (redirectUrl && !isUniversalLinkMode && !isSharingInvitation) {
          window.location.replace(redirectUrl);
        }
        redirectWithCredentials(user, mnemonic, { universalLinkMode: isUniversalLinkMode, isSharingInvitation });
      } else {
        setShowTwoFactor(true);
      }
    } catch (err: unknown) {
      const castedError = errorService.castError(err);

      if (castedError.message.includes('not activated') && auth.isValidEmail(email)) {
        navigationService.history.push(`/activate/${email}`);
      } else {
        // analyticsService.signInAttempted(email, castedError);
      }

      setLoginError([castedError.message]);
      setShowErrors(true);
    } finally {
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    if (user && mnemonic) {
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

  const getSignupLink = () => {
    const currentParams = new URLSearchParams(window.location.search);

    return currentParams.toString() ? '/new?' + currentParams.toString() : '/new';
  };

  return (
    <>
      <Helmet>
        <link rel="canonical" href={`${process.env.REACT_APP_HOSTNAME}/login`} />
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
