import { useEffect, useState } from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import { emailRegexPattern } from '@internxt/lib/dist/src/auth/isValidEmail';
import { auth } from '@internxt/lib';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import { initializeUserThunk, userActions } from 'app/store/slices/user';
import { RootState } from 'app/store';
import { useAppDispatch } from 'app/store/hooks';
//import AuthSideInfo from '../../components/AuthSideInfo/AuthSideInfo';
//import AuthButton from 'app/shared/components/AuthButton';
import Button from '../Button/Button';
import { twoFactorRegexPattern } from 'app/core/services/validation.service';
import { is2FANeeded, doLogin } from '../../services/auth.service';
import localStorageService from 'app/core/services/local-storage.service';
import analyticsService from 'app/analytics/services/analytics.service';
//import UilLock from '@iconscout/react-unicons/icons/uil-lock';
//import UilEyeSlash from '@iconscout/react-unicons/icons/uil-eye-slash';
//import UilEye from '@iconscout/react-unicons/icons/uil-eye';
import { Eye, EyeSlash, WarningCircle } from 'phosphor-react';
//import UilEnvelope from '@iconscout/react-unicons/icons/uil-envelope';
import { planThunks } from 'app/store/slices/plan';
import { productsThunks } from 'app/store/slices/products';
import errorService from 'app/core/services/error.service';
import { AppView, IFormValues } from 'app/core/types';
import navigationService from 'app/core/services/navigation.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
//import BaseInput from 'app/shared/components/forms/inputs/BaseInput';
import TextInput from '../TextInput/TextInput';
import PasswordInput from '../PasswordInput/PasswordInput';
import { referralsThunks } from 'app/store/slices/referrals';

export default function LogIn(): JSX.Element {
  const dispatch = useAppDispatch();
  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    control,
  } = useForm<IFormValues>({ mode: 'onChange' });
  const email = useWatch({ control, name: 'email', defaultValue: '' });
  const password = useWatch({ control, name: 'password', defaultValue: '' });
  const twoFactorCode = useWatch({ control, name: 'twoFactorCode', defaultValue: '' });
  const mnemonic = localStorageService.get('xMnemonic');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState('');
  const [registerCompleted, setRegisterCompleted] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [loginError, setLoginError] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showTwoFactorCode, setShowTwoFactorCode] = useState(false);
  const user = useSelector((state: RootState) => state.user.user) as UserSettings;

  const onSubmit: SubmitHandler<IFormValues> = async (formData) => {
    setIsLoggingIn(true);
    const { email, password } = formData;

    try {
      const isTfaEnabled = await is2FANeeded(email);

      if (!isTfaEnabled || showTwoFactor) {
        const { token, user } = await doLogin(email, password, twoFactorCode);
        dispatch(userActions.setUser(user));
        analyticsService.identify(user, user.email);
        analyticsService.trackSignIn({
          email: user.email,
          userId: user.uuid
        });

        try {
          dispatch(productsThunks.initializeThunk());
          dispatch(planThunks.initializeThunk());
          dispatch(referralsThunks.initializeThunk());
          await dispatch(initializeUserThunk()).unwrap();
        } catch (e: unknown) {
          console.log(e);
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

      console.error('Login error. ' + castedError.message);

      if (castedError.message.includes('not activated') && auth.isValidEmail(email)) {
        navigationService.history.push(`/activate/${email}`);
      } else {
        analyticsService.signInAttempted(email, castedError);
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

    <div className="flex flex-col items-center justify-center w-96 h-fit rounded-2xl bg-white shadow-md">
      <form className="flex flex-col w-80" onSubmit={handleSubmit(onSubmit)}>

        <span className="text-2xl font-medium mt-10 mb-6" >
          Log in
        </span>

        <span className='mb-0.5'>
          Email
        </span>
        <TextInput
          placeholder="Email"
          label="email"
          type="email"
          register={register}
          minLength={{ value: 1, message: 'Email must not be empty' }}
          pattern={{ value: emailRegexPattern, message: 'Email not valid' }}
          autoFocus={true}
          error={errors.email}
        />


        <div className='flex justify-between mb-0.5'>
          <span className='font-normal'>Password</span>
          <span
            onClick={(): void => {
              analyticsService.trackUserResetPasswordRequest();
              navigationService.push(AppView.Remove);
            }}
            className="cursor-pointer text-sm text-center font-medium text-blue-60 hover:text-blue-80"
          >
            Forgot your password?
          </span>
        </div>
        <PasswordInput
          placeholder="Password"
          label={'password'}
          type={showPassword ? 'text' : 'password'}
          register={register}
          required={true}
          minLength={{ value: 1, message: 'Password must not be empty' }}
          error={errors.password}
          icon={
            password ? (
              showPassword ? (
                <Eye className="w-6 h-6 font-medium" onClick={() => setShowPassword(false)} />
              ) : (
                <EyeSlash className="w-6 h-6 font-medium" onClick={() => setShowPassword(true)} />
              )
            ) : undefined
          }
        />

        {showTwoFactor && (
          <PasswordInput
            className='mt-2'
            label="twoFactorCode"
            placeholder="Two factor authentication code"
            type={showTwoFactorCode ? 'text' : 'password'}
            error={errors.twoFactorCode}
            register={register}
            required={true}
            icon={
              twoFactorCode ? (
                showTwoFactorCode ? (
                  <EyeSlash className="w-6 h-6 font-medium" onClick={() => setShowTwoFactorCode(false)} />
                ) : (
                  <Eye className="w-6 h-6 font-medium" onClick={() => setShowTwoFactorCode(true)} />
                )
              ) : undefined
            }
            minLength={1}
            pattern={twoFactorRegexPattern}
          />
        )}

        {loginError && showErrors && (
          <div className="flex mt-0.5">
            <WarningCircle className='h-4 rounded-full mt-0.5 mr-1 bg-red-60 text-white' />
            <span className="text-red-60 text-sm w-56 font-base">{loginError}</span>
          </div>
        )}

        <div className="mt-4">
          {/*<AuthButton
              isDisabled={isLoggingIn || !isValid}
              text="Sign in"
              textWhenDisabled={isValid ? 'Decrypting...' : 'Sign in'}
          />*/}
          <Button
            disabled={isLoggingIn || !isValid}
            text="Log in"
            disabledText={isValid ? 'Decrypting...' : 'Log in'}
            loading={isLoggingIn}
            type="primary"
          />
        </div>
      </form>

      <div className="flex flex-col items-center w-72 mb-10">

        <div className="flex w-full justify-center text-sm mt-3">
          <span className="mr-2">Don't have an account?</span>
          <Link to="/new" className='cursor-pointer text-sm text-center no-underline font-medium text-blue-60 hover:text-blue-80 appearance-none'>Create account</Link>
        </div>
      </div>
    </div>

  );
}
