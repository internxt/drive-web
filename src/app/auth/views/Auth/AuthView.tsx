import localStorageService from 'app/core/services/local-storage.service';
import { RootState } from 'app/store';
import { useSelector } from 'react-redux';
// import analyticsService, { signupDevicesource, signupCampaignSource } from 'app/analytics/services/analytics.service';
import navigationService from 'app/core/services/navigation.service';
import userService from '../../services/user.service';

import { useAppDispatch } from 'app/store/hooks';
import { userActions, userThunks, initializeUserThunk } from 'app/store/slices/user';
import { planThunks } from 'app/store/slices/plan';
import { productsThunks } from 'app/store/slices/products';
import { referralsThunks } from 'app/store/slices/referrals';
import { useSignUp } from '../../components/SignUp/useSignUp';
import { is2FANeeded, doLogin } from '../../services/auth.service';
import errorService from 'app/core/services/error.service';
import { useEffect, useState } from 'react';

import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { AppView, IFormValues } from 'app/core/types';
import { WarningCircle } from 'phosphor-react';
import TextInput from 'app/auth/components/TextInput/TextInput';
import PasswordInput from 'app/auth/components/PasswordInput/PasswordInput';
import { useForm } from 'react-hook-form';
import signup from './signup';

const PCCOMPONENTES_URL = ' https://www.pccomponentes.com';

export default function Auth(): JSX.Element {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  //!TO-DO: Change URL to PCComponents URL
  const postMessage = (data: Record<string, unknown>) => {
    window.top?.postMessage(data, PCCOMPONENTES_URL);
  };

  // FILTER MESSAGES
  const { doRegister } = useSignUp('activate');

  // LOG IN

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const token = useState(localStorageService.get('xToken'));
  const [email, setEmail] = useState<string>('');
  const mnemonic = useState(localStorageService.get('xMnemonic'));
  const [registerCompleted, setRegisterCompleted] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const user = useSelector((state: RootState) => state.user.user) as UserSettings;

  const login = async (data) => {
    const { email, password, tfa } = data;
    setEmail(email);
    setIsLoggingIn(true);

    try {
      const isTfaEnabled = await is2FANeeded(email);

      if (!isTfaEnabled || tfa) {
        const { user } = await doLogin(email, password, tfa);
        dispatch(userActions.setUser(user));

        window.rudderanalytics.identify(user.uuid, { email: user.email });
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
        setRegisterCompleted(user.registerCompleted);
        userActions.setUser(user);
      } else {
        postMessage({ action: '2fa' });
        setIsLoggingIn(false);
      }
    } catch (err: unknown) {
      const castedError = errorService.castError(err);

      if (castedError.message.includes('not activated')) {
        navigationService.history.push(`/activate/${email}`);
      } else {
        // analyticsService.signInAttempted(email, castedError);
      }

      postMessage({ action: 'error', msg: errorService.castError(err).message });
      setIsLoggingIn(false);
    }
  };

  const checkSession = () => {
    if (token && user && !registerCompleted) {
      navigationService.history.push('/appsumo/' + email);
    } else if (token && user && mnemonic) {
      if (isLoggingIn && isAuthenticated) {
        postMessage({ action: 'redirect' });
      } else {
        postMessage({ action: 'session', session: true });
      }
    } else {
      postMessage({ action: 'session', session: false });
    }
  };

  useEffect(() => {
    checkSession();
  }, [mnemonic, isAuthenticated, token, user, registerCompleted, isLoggingIn]);

  useEffect(() => {
    checkSession();
  });

  // RECOVER ACCOUNT

  const sendEmail = async (data) => {
    const { email } = data;

    try {
      await userService.sendDeactivationEmail(email);
      postMessage({ action: 'recover_email_sent' });
    } catch (err: unknown) {
      postMessage({ action: 'error', msg: translate('error.deactivatingAccount') });
    }
  };

  const {
    register,
    formState: { errors },
  } = useForm<IFormValues>({
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  return (
    // <form onSubmit={handleSubmit(signup)}>
    <div className="flex w-full max-w-lg flex-col items-center space-y-2 p-1 pt-10 md:items-start md:pt-0">
      <div className="flex w-full flex-row space-x-3 pt-1">
        <div className="flex w-full">
          <TextInput
            placeholder={translate('auth.email')}
            label="email"
            type="email"
            className={'w-full '}
            register={register}
            minLength={{ value: 1, message: 'Email must not be empty' }}
            error={errors.email}
          />
        </div>

        <div className="flex w-full">
          <PasswordInput
            placeholder={translate('auth.password')}
            label="password"
            className={'w-full '}
            register={register}
            required={true}
            minLength={{ value: 1, message: 'Password must not be empty' }}
            error={errors.password}
          />
        </div>
      </div>

      {error && (
        <div className="flex w-full flex-row items-start justify-center md:justify-start">
          <div className="flex h-5 flex-row items-center">
            <WarningCircle weight="fill" className="text-red mr-1 h-4" />
          </div>
          <span className="text-red text-sm">{error}</span>
        </div>
      )}

      <div className="flex w-full flex-row items-center space-x-3">
        <div className="w-full">
          <button
            type="submit"
            disabled={loading}
            onClick={() => {
              signup(
                {
                  email: localStorage.getItem('email'),
                  password: localStorage.getItem('password'),
                },
                dispatch,
                doRegister,
                setLoading,
                setError,
              );
            }}
            className={
              'focus:outline-none shadow-xm relative flex h-11 w-full flex-row items-center justify-center space-x-4 whitespace-nowrap rounded-lg bg-primary px-0 py-2.5 text-lg text-white transition duration-100 focus-visible:bg-primary-dark active:bg-primary-dark disabled:cursor-not-allowed disabled:text-white/75 sm:text-base'
            }
          >
            {loading ? (
              <svg
                className="absolute mx-auto animate-spin"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 6.10352e-05C9.3688 6.10515e-05 10.7147 0.35127 11.909 1.02009C13.1032 1.68892 14.1059 2.65298 14.8211 3.82007C15.5363 4.98716 15.9401 6.31824 15.9938 7.68598C16.0476 9.05372 15.7495 10.4124 15.1281 11.632C14.5066 12.8516 13.5827 13.8914 12.4446 14.6518C11.3064 15.4123 9.99225 15.868 8.62767 15.9754C7.2631 16.0828 5.89379 15.8383 4.65072 15.2652C3.40766 14.6921 2.33242 13.8097 1.52787 12.7023L3.1459 11.5268C3.74932 12.3573 4.55575 13.0191 5.48804 13.4489C6.42034 13.8787 7.44732 14.0621 8.47076 13.9816C9.49419 13.901 10.4798 13.5592 11.3334 12.9889C12.187 12.4185 12.88 11.6387 13.346 10.724C13.8121 9.8093 14.0357 8.79031 13.9954 7.7645C13.9551 6.7387 13.6522 5.74039 13.1158 4.86507C12.5794 3.98975 11.8274 3.2667 10.9317 2.76508C10.036 2.26347 9.0266 2.00006 8 2.00006V6.10352e-05Z"
                  fill="#FFFFFF"
                />
              </svg>
            ) : (
              <div className="flex flex-row items-center space-x-1.5 rounded-lg bg-primary text-white">
                <span>Get</span>
                <span className="opacity-50">{'—'}</span>
                <span className="opacity-50">10GB for free</span>
              </div>
            )}
          </button>
        </div>

        <span className="w-full text-xs text-gray-50 sm:text-left">
          <span>Creating account you accept</span>{' '}
          <a href="/legal" target="_blank" className="hover:text-gray-60 hover:underline active:text-gray-80">
            Terms of Service
          </a>
          <span>{'.'}</span>
        </span>
      </div>
    </div>
    // </form>
  );
}
