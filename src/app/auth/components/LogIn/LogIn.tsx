import { useEffect, useMemo, useState } from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import { auth } from '@internxt/lib';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import { initializeUserThunk, userActions } from 'app/store/slices/user';
import { RootState } from 'app/store';
import { useAppDispatch } from 'app/store/hooks';
import Button from '../Button/Button';
import { twoFactorRegexPattern } from 'app/core/services/validation.service';
import authService, { is2FANeeded, doLogin } from '../../services/auth.service';
import localStorageService from 'app/core/services/local-storage.service';
// import analyticsService from 'app/analytics/services/analytics.service';
import { WarningCircle } from 'phosphor-react';
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

export default function LogIn(): JSX.Element {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState('');
  const [registerCompleted, setRegisterCompleted] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [loginError, setLoginError] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const user = useSelector((state: RootState) => state.user.user) as UserSettings;

  useEffect(() => {
    if (autoSubmit.enabled && autoSubmit.credentials) {
      onSubmit(getValues());
    }
  }, []);

  const onSubmit: SubmitHandler<IFormValues> = async (formData, event) => {
    event?.preventDefault();
    setIsLoggingIn(true);
    const { email, password } = formData;

    try {
      const isTfaEnabled = await is2FANeeded(email);

      if (!isTfaEnabled || showTwoFactor) {
        const { token, user } = await doLogin(email, password, twoFactorCode);
        dispatch(userActions.setUser(user));

        window.rudderanalytics.identify(user.uuid, { email: user.email, uuid: user.uuid });
        window.rudderanalytics.track('User Signin', { email: user.email });

        // analyticsService.identify(user, user.email);
        // analyticsService.trackSignIn({
        //   email: user.email,
        //   userId: user.uuid,
        // });

        try {
          dispatch(productsThunks.initializeThunk());
          dispatch(planThunks.initializeThunk());
          dispatch(referralsThunks.initializeThunk());
          await dispatch(initializeUserThunk()).unwrap();
        } catch (e: unknown) {
          // PASS
        }

        setIsAuthenticated(true);
        setToken(token);
        userActions.setUser(user);
        setRegisterCompleted(user.registerCompleted);
        const redirectUrl = authService.getRedirectUrl(new URLSearchParams(window.location.search), token);

        if (redirectUrl) {
          window.location.replace(redirectUrl);
        }
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
    if (user && user.registerCompleted && mnemonic) {
      dispatch(userActions.setUser(user));

      const params = new URLSearchParams(navigationService.history.location.search);
      const planId = params.get('planId') !== undefined ? (params.get('planId') as string) : '';
      const mode = params.get('mode') !== undefined ? (params.get('mode') as string) : '';
      const coupon = params.get('couponCode') !== undefined ? (params.get('couponCode') as string) : '';

      if (planId && mode) {
        coupon
          ? window.location.replace(
              `https://drive.internxt.com/checkout-plan?planId=${planId}&couponCode=${coupon}&mode=${mode}`,
            )
          : window.location.replace(`https://drive.internxt.com/checkout-plan?planId=${planId}&mode=${mode}`);
      } else {
        navigationService.push(AppView.Drive);
      }
    }
    if (user && user.registerCompleted === false) {
      navigationService.history.push('/appsumo/' + user.email);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && token && user) {
      const mnemonic = localStorageService.get('xMnemonic');

      if (!registerCompleted) {
        navigationService.history.push('/appsumo/' + email);
      } else if (mnemonic) {
        const params = new URLSearchParams(navigationService.history.location.search);
        const planId = params.get('planId') !== undefined ? (params.get('planId') as string) : '';
        const mode = params.get('mode') !== undefined ? (params.get('mode') as string) : '';
        const coupon = params.get('couponCode') !== undefined ? (params.get('couponCode') as string) : '';
        if (planId && mode) {
          coupon
            ? window.location.replace(
                `https://drive.internxt.com/checkout-plan?planId=${planId}&couponCode=${coupon}&mode=${mode}`,
              )
            : window.location.replace(`https://drive.internxt.com/checkout-plan?planId=${planId}&mode=${mode}`);
        } else {
          navigationService.push(AppView.Drive);
        }
      }
    }
  }, [isAuthenticated, token, user, registerCompleted]);

  const getSignupLink = () => {
    const currentParams = new URLSearchParams(window.location.search);

    return currentParams.toString() ? '/new?' + currentParams.toString() : '/new';
  };

  return (
    <div className="flex h-fit w-96 flex-col items-center justify-center rounded-2xl bg-white px-8 py-10 sm:shadow-soft">
      <form className="flex w-full flex-col space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <h1 className="text-2xl font-medium">{translate('auth.login.title')}</h1>

        <div className="flex flex-col space-y-3">
          <label className="space-y-0.5">
            <span>{translate('auth.email')}</span>
            <TextInput
              placeholder={translate('auth.email')}
              label="email"
              type="email"
              register={register}
              minLength={{ value: 1, message: 'Email must not be empty' }}
              error={errors.email}
            />
          </label>

          <label className="space-y-0.5">
            <div className="flex flex-row items-center justify-between">
              <span className="font-normal">{translate('auth.password')}</span>
              <Link
                onClick={(): void => {
                  // analyticsService.trackUserResetPasswordRequest();
                }}
                to="/remove"
                className="cursor-pointer appearance-none text-center text-sm font-medium text-primary no-underline hover:text-primary focus:text-primary-dark"
              >
                {translate('auth.login.forgotPwd')}
              </Link>
            </div>

            <PasswordInput
              placeholder={translate('auth.password')}
              label="password"
              register={register}
              required={true}
              minLength={{ value: 1, message: 'Password must not be empty' }}
              error={errors.password}
            />
          </label>

          {showTwoFactor && (
            <label className="space-y-0.5">
              <span>{translate('auth.login.2FA')}</span>
              <PasswordInput
                className="mb-3"
                label="twoFactorCode"
                placeholder={translate('auth.login.twoFactorAuthenticationCode')}
                error={errors.twoFactorCode}
                register={register}
                required={true}
                minLength={1}
                pattern={twoFactorRegexPattern}
              />
            </label>
          )}

          {loginError && showErrors && (
            <div className="flex flex-row items-start pt-1">
              <div className="flex h-5 flex-row items-center">
                <WarningCircle weight="fill" className="mr-1 h-4 text-red-std" />
              </div>
              <span className="font-base w-56 text-sm text-red-60">{loginError}</span>
            </div>
          )}

          <Button
            disabled={isLoggingIn}
            text={translate('auth.login.title')}
            disabledText={
              isValid ? (translate('auth.decrypting') as string) : (translate('auth.login.title') as string)
            }
            loading={isLoggingIn}
            style="button-primary"
            className="w-full"
          />
        </div>
      </form>

      <div className="mt-4 flex w-full justify-center text-sm">
        <span>
          {translate('auth.login.dontHaveAccount')}{' '}
          <Link
            to={getSignupLink()}
            className="cursor-pointer appearance-none text-center text-sm font-medium text-primary no-underline hover:text-primary focus:text-primary-dark"
          >
            {translate('auth.login.createAccount')}
          </Link>
        </span>
      </div>
    </div>
  );
}
