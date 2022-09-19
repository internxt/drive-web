import { useEffect, useState } from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import { auth } from '@internxt/lib';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import { initializeUserThunk, userActions } from 'app/store/slices/user';
import { RootState } from 'app/store';
import { useAppDispatch } from 'app/store/hooks';
import Button from '../Button/Button';
import { twoFactorRegexPattern } from 'app/core/services/validation.service';
import { is2FANeeded, doLogin } from '../../services/auth.service';
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
import analyticsService from 'app/analytics/services/analytics.service';

export default function LogIn(): JSX.Element {
  const dispatch = useAppDispatch();
  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    control,
  } = useForm<IFormValues>({ mode: 'onChange' });
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

  const onSubmit: SubmitHandler<IFormValues> = async (formData) => {
    setIsLoggingIn(true);
    const { email, password } = formData;

    try {
      const isTfaEnabled = await is2FANeeded(email);

      if (!isTfaEnabled || showTwoFactor) {
        const { token, user } = await doLogin(email, password, twoFactorCode);
        dispatch(userActions.setUser(user));

        analyticsService.rudderIdentify(user);
        analyticsService.rudderTrackSignIn(user.email);

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
      navigationService.push(AppView.Drive);
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
        navigationService.push(AppView.Drive);
      }
    }
  }, [isAuthenticated, token, user, registerCompleted]);

  return (
    <div className="flex h-fit w-96 flex-col items-center justify-center rounded-2xl bg-white px-8 py-10 sm:shadow-soft">
      <form className="flex w-full flex-col space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <span className="text-2xl font-medium">Log in</span>

        <div className="flex flex-col space-y-3">
          <label className="space-y-0.5">
            <span>Email</span>
            <TextInput
              placeholder="Email"
              label="email"
              type="email"
              register={register}
              minLength={{ value: 1, message: 'Email must not be empty' }}
              error={errors.email}
            />
          </label>

          <label className="space-y-0.5">
            <div className="flex flex-row items-center justify-between">
              <span className="font-normal">Password</span>
              <Link
                onClick={(): void => {
                  // analyticsService.trackUserResetPasswordRequest();
                }}
                to="/remove"
                className="cursor-pointer appearance-none text-center text-sm font-medium text-primary no-underline hover:text-primary focus:text-primary-dark"
              >
                Forgot your password?
              </Link>
            </div>

            <PasswordInput
              placeholder="Password"
              label={'password'}
              register={register}
              required={true}
              minLength={{ value: 1, message: 'Password must not be empty' }}
              error={errors.password}
            />
          </label>

          {showTwoFactor && (
            <label className="space-y-0.5">
              <span>Two factor code</span>
              <PasswordInput
                className="mb-3"
                label="twoFactorCode"
                placeholder="Two factor authentication code"
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
            text="Log in"
            disabledText={isValid ? 'Decrypting...' : 'Log in'}
            loading={isLoggingIn}
            style="button-primary"
            className="w-full"
          />
        </div>
      </form>

      <div className="mt-4 flex w-full justify-center text-sm">
        <span>
          Don't have an account?{' '}
          <Link
            to="/new"
            className="cursor-pointer appearance-none text-center text-sm font-medium text-primary no-underline hover:text-primary focus:text-primary-dark"
          >
            Create account
          </Link>
        </span>
      </div>
    </div>
  );
}
