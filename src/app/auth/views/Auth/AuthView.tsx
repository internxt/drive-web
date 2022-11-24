import localStorageService from 'app/core/services/local-storage.service';
import { RootState } from 'app/store';
import { useSelector } from 'react-redux';
// import analyticsService, { signupDevicesource, signupCampaignSource } from 'app/analytics/services/analytics.service';
import navigationService from 'app/core/services/navigation.service';
import userService from '../../services/user.service';
import i18n from 'app/i18n/services/i18n.service';

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
import analyticsService from 'app/analytics/services/analytics.service';

export default function Auth(): JSX.Element {
  const dispatch = useAppDispatch();

  const postMessage = (data: Record<string, unknown>) => {
    window.top?.postMessage(data, 'https://internxt.com');
  };

  // FILTER MESSAGES

  const permitedDomains = [
    'https://drive.internxt.com',
    'https://internxt.com',
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  useEffect(() => {
    const onRecieveMessage = (e) => {
      if (permitedDomains.includes(e.origin)) {
        if (e.data.action === 'signup') {
          signup(e.data);
        } else if (e.data.action === 'check_session') {
          checkSession();
        } else if (e.data.action === 'login') {
          login(e.data);
        } else if (e.data.action === 'recover') {
          sendEmail(e.data);
        }
      }
    };

    window.addEventListener('message', onRecieveMessage);

    return () => {
      window.removeEventListener('message', onRecieveMessage);
    };
  });

  // SIGN UP

  const { doRegister } = useSignUp('activate');

  // async function signUpWithRecaptcha(data) {
  //   const grecaptcha = window.grecaptcha;

  //   grecaptcha.ready(() => {
  //     grecaptcha.execute(process.env.REACT_APP_RECAPTCHA_V3, { action: 'register' }).then((token) => {
  //       // Can't wait or token will expire
  //       data.token = token;
  //       signup(data);
  //     });
  //   });
  // }

  const signup = async (data) => {
    const { inline } = data;
    const { email, password, token } = data;

    try {
      const res = await doRegister(email, password, token);
      const xUser = res.xUser;
      const xToken = res.xToken;
      const mnemonic = res.mnemonic;
      localStorageService.set('xToken', xToken);
      dispatch(userActions.setUser(xUser));
      localStorageService.set('xMnemonic', mnemonic);
      dispatch(productsThunks.initializeThunk());
      dispatch(planThunks.initializeThunk());
      dispatch(referralsThunks.initializeThunk());
      await dispatch(userThunks.initializeUserThunk());

      analyticsService.trackSignUp({ userId: xUser.uuid, email: email });

      postMessage({ action: 'redirect' });
    } catch (err: any) {
      if (inline === true) {
        postMessage({ action: 'error_inline', msg: errorService.castError(err).message });
      } else {
        postMessage({ action: 'error', msg: errorService.castError(err).message });
      }
      analyticsService.trackSignUpError(err, email);
    }
  };

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
        analyticsService.trackSignIn({ userId: user.uuid, email: user.email });
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
      analyticsService.trackSignInError(email, castedError.message);
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
      postMessage({ action: 'error', msg: i18n.get('error.deactivatingAccount') });
    }
  };

  return <></>;
}
