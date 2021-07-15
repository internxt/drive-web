import React from 'react';
import SideInfo from './SideInfo';
import { IconTypes } from '../../models/enums';
import { getIcon } from '../../services/getIcon';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import { UserSettings } from '../../models/interfaces';
import { useEffect } from 'react';
import localStorageService from '../../services/localStorage.service';
import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { emailRegexPattern, validateEmail } from '../../services/validation.service';
import analyticsService from '../../services/analytics.service';
import { toast } from 'react-toastify';
import { check2FANeeded, doLogin } from '../../services/auth.service';

interface LoginProps {
  email?: string
  password?: string
  handleKeySaved?: (user: any) => void
  isAuthenticated: boolean,
  setUser: (user: UserSettings) => void
}

export interface ILoginFormValues {
  email: string,
  password: string,
  remember: boolean
}

const texts = {
  label: 'INTERNXT',
  title: 'Privacy security and flexible',
  subtitle: 'Drive cloud storage is part of the ecosystem of solutions developed by Internxt to protect the security and privacy of companies and individuals',
  link: 'internxt.com',
  href: 'https://internxt.com'
};

const Login = ({ handleKeySaved }: LoginProps): JSX.Element => {
  const history = useHistory();
  const { register, formState: { errors }, handleSubmit, control } = useForm<ILoginFormValues>({ mode: 'onChange' });

  const mnemonic = localStorageService.get('xMnemonic');
  const [token, setToken] = useState('');
  const [user, setUser] = useState(localStorageService.getUser());
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isTeam, setIsTeam] = useState(false);
  const [registerCompleted, setRegisterCompleted] = useState(true);

  const email = useWatch({ control, name: 'email', defaultValue: '' });
  const password = useWatch({ control, name: 'password', defaultValue: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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

  const onSubmit: SubmitHandler<ILoginFormValues> = async formData => {
    const { email, password } = formData;

    console.log('login data =>', formData);
    try {
      console.log('before check2FA');
      const res = await check2FANeeded(email);

      console.log('after check2FA');
      if (!res.tfa) {
        const { data, user } = await doLogin(email, password, twoFactorCode);

        if (handleKeySaved) {
          handleKeySaved(user);
        }
        analyticsService.identify(data.user, email);
        analyticsService.signIn({ email, userId: data.user.uuid });

        setUser(user);
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
        toast.warn(<>Login error<br />{err.message}</>);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className='flex h-full'>
      <SideInfo texts={texts} />

      <div className='flex w-full items-center justify-center'>
        <form className='flex flex-col w-56' onSubmit={handleSubmit(onSubmit)}>
          <img src={getIcon(IconTypes.InternxtLongLogo)} width='110' alt="" />
          <span className='text-sm text-neutral-500 mt-1.5 mb-6'>Cloud Storage</span>

          <div className='relative'>
            <input type="email" placeholder="Email" {...register('email', { required: true, pattern: emailRegexPattern })}
              className={`w-full transform duration-200 ${errors.email ? 'error' : ''}`} />
            <div className='absolute right-3.5 bottom-6 flex items-center justify-center'>
              <img src={getIcon(IconTypes.MailGray)} alt="" />
            </div>
          </div>

          <div className='relative'>
            <input type={showPassword ? 'text' : 'password'} placeholder="Password" {...register('password', { required: true, maxLength: 40 })}
              className={`w-full transform duration-200 ${errors.password ? 'error' : ''}`} />
            <div className={`absolute ${password ? 'right-3 bottom-5 cursor-pointer' : 'right-3.5 bottom-6'}  flex items-center justify-center`}
              onClick={() => setShowPassword(!showPassword)}
            >
              {
                password ?
                  showPassword ?
                    <img src={getIcon(IconTypes.EyeSlashGray)} alt="" />
                    :
                    <img src={getIcon(IconTypes.EyeGray)} alt="" />
                  :
                  <img src={getIcon(IconTypes.LockGray)} alt="" />
              }
            </div>
          </div>

          <label className='flex items-center mt-2 mb-3.5 cursor-pointer'>
            <input type="checkbox" placeholder="Remember me" {...register('remember')} />
            <span className='text-sm text-neutral-500 ml-3 select-none'>Remember me</span>
          </label>

          <button type='submit' className='flex items-center justify-center bg-blue-60 py-2 rounded text-white text-sm'
            disabled={!errors || isLoggingIn}
          >
            <span>{isLoggingIn ? 'Decrypting...' : 'Sign in'}</span>
          </button>

          <a href="" className='text-sm text-blue-60 mt-3.5'>Forgot your password?</a>
        </form>
      </div>
    </div>
  );
};

export default Login;
