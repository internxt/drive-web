import { useEffect, useState } from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';

import { setUser } from '../../store/slices/userSlice';
import { RootState } from '../../store';
import { useAppDispatch } from '../../store/hooks';
import CheckboxPrimary from '../../components/Checkboxes/CheckboxPrimary';
import AuthInput from '../../components/Inputs/AuthInput';
import SideInfo from '../Authentication/SideInfo';
import AuthButton from '../../components/Buttons/AuthButton';
import { emailRegexPattern, validateEmail } from '../../services/validation.service';
import { check2FANeeded, doLogin } from '../../services/auth.service';
import localStorageService from '../../services/localStorage.service';
import analyticsService from '../../services/analytics.service';
import history from '../../lib/history';
import iconService, { IconType } from '../../services/icon.service';
import BaseButton from '../../components/Buttons/BaseButton';
import { useSelector } from 'react-redux';
import { UserSettings } from '../../models/interfaces';

interface SignInFormData {
  name: string,
  lastname: string,
  email: string,
  password: string,
  twoFactorCode: string,
  confirmPassword: string,
  remember: boolean,
  acceptTerms: boolean
}

interface SignInProps {
  email?: string,
  password?: string,
}

export default function SignInView(props: SignInProps): JSX.Element {
  const dispatch = useAppDispatch();
  const { register, formState: { errors }, handleSubmit, control } = useForm<SignInFormData>({ mode: 'onChange' });
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
  const user: UserSettings = useSelector((state: RootState) => state.user.user);

  const onSubmit: SubmitHandler<SignInFormData> = async formData => {
    setIsLoggingIn(true);
    const { email, password } = formData;

    try {
      const res = await check2FANeeded(email);

      if (!res.tfa || showTwoFactor) {
        const { data, user } = await doLogin(email, password, twoFactorCode);

        dispatch(setUser(user));
        analyticsService.identify(data.user, email);
        analyticsService.trackSignIn({ email, userId: data.user.uuid });

        setIsAuthenticated(true);
        setToken(data.token);
        setUser(user);
        setRegisterCompleted(data.user.registerCompleted);
      } else {
        setShowTwoFactor(true);
      }
    } catch (err) {
      console.error('Login error. ' + err.message);

      if (err.message.includes('not activated') && validateEmail(email)) {
        history.push(`/activate/${email}`);
      } else {
        analyticsService.signInAttempted(email, err);
      }
      const error = err.message ? err.message : err;

      console.log('push =>', error);
      setLoginError(error);
      setShowErrors(true);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handlePasswordInputClick = () => {
    setShowPassword(!showPassword);
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
      <SideInfo />

      <div className='flex flex-col items-center justify-center w-full'>
        <form className='flex flex-col w-72' onSubmit={handleSubmit(onSubmit)}>
          <img src={iconService.getIcon(IconType.InternxtLongLogo)} width='110' alt="" />
          <span className='text-sm text-neutral-500 mt-1.5 mb-6'>Cloud Storage</span>

          <AuthInput
            placeholder='Email'
            label='email'
            type='email'
            icon={IconType.MailGray}
            register={register}
            required={true}
            minLength={{ value: 1, message: 'Email must not be empty' }}
            pattern={{ value: emailRegexPattern, message: 'Email not valid' }}
            error={errors.email}
          />

          <AuthInput
            placeholder='Password'
            label={'password'}
            type={showPassword ? 'text' : 'password'}
            icon={password
              ? showPassword ? IconType.EyeSlashGray : IconType.EyeGray
              : IconType.LockGray
            }
            register={register}
            required={true}
            minLength={{ value: 1, message: 'Password must not be empty' }}
            error={errors.password}
            onClick={handlePasswordInputClick}
          />

          {
            showTwoFactor && (
              <AuthInput
                placeholder='Two factor authentication code'
                label={'twoFactorCode'}
                type={'text'}
                icon={IconType.LockGray}
                register={register}
                pattern={/^\d{3}(\s+)?\d{3}$/}
                required={true}
                minLength={{ value: 1, message: 'Two factor code must not be empty' }}
                error={errors.twoFactorCode}
              />
            )
          }

          {
            loginError && showErrors &&
            <div className='flex ml-3 my-1'>
              <div className='w-1.5 h-1.5 bg-neutral-600 rounded-full mt-1.5 mr-2' />
              <span className='text-neutral-600 text-sm'>{loginError}</span>
            </div>
          }

          <div className='flex flex-col'>
            <CheckboxPrimary label='remember' text='Remember me' required={false} register={register} />
            <AuthButton isDisabled={isLoggingIn} text='Sign in' textWhenDisabled='Decrypting...' />
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
            <span>Don't have an account?</span>
            <a className="ml-2" href="/new">
              Get started
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}