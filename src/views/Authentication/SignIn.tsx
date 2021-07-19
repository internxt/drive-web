import React from 'react';
import CheckboxPrimary from '../../components/Checkboxes/CheckboxPrimary';
import AuthInput from '../../components/Inputs/AuthInput';
import SideInfo from './SideInfo';
import AuthButton from '../../components/Buttons/AuthButton';
import { IconTypes } from '../../models/enums';
import { getIcon } from '../../services/getIcon';
import { emailRegexPattern, validateEmail } from '../../services/validation.service';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import { IFormValues } from '../../models/interfaces';
import { useState } from 'react';
import { check2FANeeded, doLogin } from '../../services/auth.service';
import localStorageService from '../../services/localStorage.service';
import analyticsService from '../../services/analytics.service';
import { useEffect } from 'react';
import history from '../../lib/history';
import ButtonTextOnly from '../../components/Buttons/ButtonTextOnly';

interface SignInProps {
  email?: string,
  password?: string,
  handleKeySaved?: (user: any) => void,
  isAuthenticated: boolean
}

const texts = {
  label: 'INTERNXT',
  title: 'Privacy security and flexible',
  subtitle: 'Drive cloud storage is part of the ecosystem of solutions developed by Internxt to protect the security and privacy of companies and individuals',
  link: 'internxt.com',
  href: 'https://internxt.com'
};

const SignIn = ({ handleKeySaved }: SignInProps): JSX.Element => {
  const { register, formState: { errors }, handleSubmit, control } = useForm<IFormValues>({ mode: 'onChange' });

  const email = useWatch({ control, name: 'email', defaultValue: '' });
  const password = useWatch({ control, name: 'password', defaultValue: '' });
  const mnemonic = localStorageService.get('xMnemonic');
  const [user, setUser] = useState(localStorageService.getUser());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [token, setToken] = useState('');
  const [registerCompleted, setRegisterCompleted] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isTeam, setIsTeam] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [loginError, setLoginError] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit: SubmitHandler<IFormValues> = async formData => {
    setIsLoggingIn(true);
    const { email, password } = formData;

    try {
      const res = await check2FANeeded(email);

      if (!res.tfa) {
        const { data, user } = await doLogin(email, password, twoFactorCode);

        if (handleKeySaved) {
          handleKeySaved(user);
        }
        analyticsService.identify(data.user, email);
        analyticsService.signIn({ email, userId: data.user.uuid });

        setIsAuthenticated(true);
        setToken(data.token);
        setUser(user);
        setRegisterCompleted(data.user.registerCompleted);
        setIsTeam(false);
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
    if (user && user.registerCompleted && mnemonic && handleKeySaved) {
      handleKeySaved(user);
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
      <SideInfo texts={texts} />

      <div className='flex flex-col items-center justify-center w-full'>
        <form className='flex flex-col w-72' onSubmit={handleSubmit(onSubmit)}>
          <img src={getIcon(IconTypes.InternxtLongLogo)} width='110' alt="" />
          <span className='text-sm text-neutral-500 mt-1.5 mb-6'>Cloud Storage</span>

          <AuthInput
            placeholder='Email'
            label='email'
            type='email'
            icon={IconTypes.MailGray}
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
              ? showPassword ? IconTypes.EyeSlashGray : IconTypes.EyeGray
              : IconTypes.LockGray
            }
            register={register}
            required={true}
            minLength={{ value: 1, message: 'Password must not be empty' }}
            error={errors.password}
            onClick={handlePasswordInputClick}
          />

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
          <a href="" target='_blank' className='transition duration-200 easi-in-out text-sm text-center text-blue-60 hover:text-blue-80 mt-3.5'>Forgot your password?</a>

          <div className='flex w-full justify-center text-sm mt-3'>
            <span>Don't have an account?</span>
            <ButtonTextOnly text='Get started' onClick={() => history.push('/new')} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
