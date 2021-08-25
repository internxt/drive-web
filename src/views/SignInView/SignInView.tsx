import { useEffect, useState } from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';

import { initializeUserThunk, setUser } from '../../store/slices/user';
import { RootState } from '../../store';
import { useAppDispatch } from '../../store/hooks';
import BaseInput from '../../components/Inputs/BaseInput';
import SideInfo from '../Authentication/SideInfo';
import AuthButton from '../../components/Buttons/AuthButton';
import validationService, { emailRegexPattern, twoFactorRegexPattern } from '../../services/validation.service';
import { check2FANeeded, doLogin } from '../../services/auth.service';
import localStorageService from '../../services/local-storage.service';
import analyticsService from '../../services/analytics.service';
import history from '../../lib/history';
import bigLogo from '../../assets/icons/big-logo.svg';
import { useSelector } from 'react-redux';
import { IFormValues, UserSettings } from '../../models/interfaces';
import { UilLock, UilEyeSlash, UilEye, UilEnvelope } from '@iconscout/react-unicons';
import { Link } from 'react-router-dom';
import { planThunks } from '../../store/slices/plan';

interface SignInProps {
  email?: string,
  password?: string,
}

export const texts = {
  label: 'INTERNXT',
  sublabel: 'BE LIMITLESS'
};

export default function SignInView(props: SignInProps): JSX.Element {
  const dispatch = useAppDispatch();
  const { register, formState: { errors, isValid }, handleSubmit, control } = useForm<IFormValues>({ mode: 'onChange' });
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

  const onSubmit: SubmitHandler<IFormValues> = async formData => {
    setIsLoggingIn(true);
    const { email, password } = formData;

    try {
      const res = await check2FANeeded(email);

      if (!res.tfa || showTwoFactor) {
        const { data, user } = await doLogin(email, password, twoFactorCode);

        dispatch(setUser(user));
        analyticsService.identify(data.user, email);
        analyticsService.trackSignIn({ email, userId: data.user.uuid });

        try {
          dispatch(planThunks.initializeThunk());
          await dispatch(initializeUserThunk()).unwrap();
        } catch (e) {
          console.log(e);
        }

        setIsAuthenticated(true);
        setToken(data.token);
        setUser(user);
        setRegisterCompleted(data.user.registerCompleted);
      } else {
        setShowTwoFactor(true);
      }
    } catch (err) {
      console.error('Login error. ' + err.message);

      if (err.message.includes('not activated') && validationService.validateEmail(email)) {
        history.push(`/activate/${email}`);
      } else {
        analyticsService.signInAttempted(email, err);
      }
      const error = err.message ? err.message : err;

      setLoginError(error);
      setShowErrors(true);
    } finally {
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    if (user && user.registerCompleted && mnemonic) {
      dispatch(setUser(user));
      history.push('/app');
    }
    if (user && user.registerCompleted === false) {
      history.push('/appsumo/' + user.email);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && token && user) {
      const mnemonic = localStorageService.get('xMnemonic');

      if (!registerCompleted) {
        history.push('/appsumo/' + email);
      } else if (mnemonic) {
        history.push('/app');
      }
    }
  }, [isAuthenticated, token, user, registerCompleted]);

  return (
    <div className='flex h-full w-full'>
      <SideInfo title="" subtitle="" />

      <div className='flex flex-col items-center justify-center w-full'>
        <form className='flex flex-col w-72' onSubmit={handleSubmit(onSubmit)}>
          <img src={bigLogo} width='110' alt="" />
          <span className='text-sm text-neutral-500 mt-1.5 mb-6' />

          <BaseInput
            placeholder='Email'
            label='email'
            type='email'
            icon={<UilEnvelope className='w-4'/>}
            register={register}
            required={true}
            minLength={{ value: 1, message: 'Email must not be empty' }}
            pattern={{ value: emailRegexPattern, message: 'Email not valid' }}
            error={errors.email}
          />

          <BaseInput
            placeholder='Password'
            label={'password'}
            type={showPassword ? 'text' : 'password'}
            icon={password ?
              (showPassword ?
                <UilEyeSlash className='w-4' onClick={() => setShowPassword(false)}/>
                : <UilEye className='w-4' onClick={() => setShowPassword(true)}/>) :
              <UilLock className='w-4'/>
            }
            register={register}
            required={true}
            minLength={{ value: 1, message: 'Password must not be empty' }}
            error={errors.password}
          />

          {
            showTwoFactor && (
              <BaseInput
                label='twoFactorCode'
                placeholder='Two factor authentication code'
                type={showTwoFactorCode ? 'text' :'password'}
                error={errors.twoFactorCode}
                register={register}
                required={true}
                icon={twoFactorCode ?
                  (showTwoFactorCode ?
                    <UilEyeSlash className='w-4' onClick={() => setShowTwoFactorCode(false)}/>
                    :
                    <UilEye className='w-4' onClick={() => setShowTwoFactorCode(true)}/>) :
                  <UilLock className='w-4'/>
                }
                minLength={1}
                pattern={twoFactorRegexPattern} />

            )
          }

          {
            loginError && showErrors &&
            <div className='flex my-1'>
              <span className='text-red-60 text-sm w-56 font-medium'>{loginError}</span>
            </div>
          }

          <div className='mt-2'>
            <AuthButton isDisabled={isLoggingIn || !isValid} text='Sign in' textWhenDisabled={isValid ? 'Decrypting...' : 'Sign in'} />
          </div>
        </form>

        <div className='flex flex-col items-center w-72'>
          <span
            onClick={(e: any) => {
              analyticsService.trackUserResetPasswordRequest();
              history.push('/remove');
            }}
            className='cursor-pointer text-sm text-center text-blue-60 hover:text-blue-80 mt-3.5'
          >
            Forgot your password?
          </span>

          <div className='flex w-full justify-center text-sm mt-3'>
            <span className="mr-2">Don't have an account?</span>
            <Link to="/new">Get started</Link>
          </div>
        </div>
      </div>
    </div>
  );
}