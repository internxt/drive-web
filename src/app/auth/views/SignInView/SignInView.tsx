/*import { useEffect, useState } from 'react';
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
import Button from '../../components/Button/Button';
import { twoFactorRegexPattern } from 'app/core/services/validation.service';
import { is2FANeeded, doLogin } from '../../services/auth.service';
import localStorageService from 'app/core/services/local-storage.service';
import analyticsService from 'app/analytics/services/analytics.service';

//import UilLock from '@iconscout/react-unicons/icons/uil-lock';
//import UilEyeSlash from '@iconscout/react-unicons/icons/uil-eye-slash';
//import UilEye from '@iconscout/react-unicons/icons/uil-eye';
import {Eye, EyeSlash, WarningCircle} from 'phosphor-react';
//import UilEnvelope from '@iconscout/react-unicons/icons/uil-envelope';
import { planThunks } from 'app/store/slices/plan';
import { productsThunks } from 'app/store/slices/products';
import errorService from 'app/core/services/error.service';
import { AppView, IFormValues } from 'app/core/types';
import navigationService from 'app/core/services/navigation.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
//import BaseInput from 'app/shared/components/forms/inputs/BaseInput';
import TextInput from '../../components/TextInput/TextInput';
import PasswordInput from '../../components/PasswordInput/PasswordInput';
import { referralsThunks } from 'app/store/slices/referrals';*/
import bigLogo from 'assets/icons/big-logo.svg';
import  LogIn  from '../../components/LogIn/LogIn';

export default function SignInView(): JSX.Element {
  /*const dispatch = useAppDispatch();
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
  }, [isAuthenticated, token, user, registerCompleted]);*/

  return (
    <div className="flex h-full w-full bg-gray-5 justify-center">
     
      <img src={bigLogo} width="150" alt="" className='absolute top-10 left-20'/> 
      <div className='mt-48'>
        <LogIn/>
      </div>
    </div>
  );
}
