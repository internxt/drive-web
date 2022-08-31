import { useState, useEffect } from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import queryString from 'query-string';
import { auth } from '@internxt/lib';

import localStorageService from 'app/core/services/local-storage.service';
import analyticsService, { signupDevicesource, signupCampaignSource } from 'app/analytics/services/analytics.service';

import { useAppDispatch } from 'app/store/hooks';
import { userActions, userThunks } from 'app/store/slices/user';
import { planThunks } from 'app/store/slices/plan';
import errorService from 'app/core/services/error.service';
import navigationService from 'app/core/services/navigation.service';
import { productsThunks } from 'app/store/slices/products';
import { AppView, IFormValues } from 'app/core/types';
import { referralsThunks } from 'app/store/slices/referrals';
import TextInput from '../../components/TextInput/TextInput';
import PasswordInput from '../../components/PasswordInput/PasswordInput';
import Button from '../../components/Button/Button';
import testPasswordStrength from '@internxt/lib/dist/src/auth/testPasswordStrength';
import { ArrowRight, WarningCircle } from 'phosphor-react';
import { useSignUp } from './useSignUp';

export interface SignUpProps {
  location: {
    search: string;
  };
  isNewUser: boolean;
}

function SignUpWebsite(props: SignUpProps): JSX.Element {
  const qs = queryString.parse(navigationService.history.location.search);
  const hasEmailParam = (qs.email && auth.isValidEmail(qs.email as string)) || false;
  const tokenParam = qs.token;
  const hasReferrer = !!qs.ref;
  const { doRegister } = useSignUp(
    'activate',
    hasReferrer ? String(qs.ref) : undefined,
  );
  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    control,
  } = useForm<IFormValues>({
    mode: 'onChange',
    defaultValues: {
      email: hasEmailParam ? (qs.email as string) : '',
    },
  });
  const dispatch = useAppDispatch();

  const password = useWatch({ control, name: 'password', defaultValue: '' });
  const [signupError, setSignupError] = useState<Error | string>();
  const [showError, setShowError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordState, setPasswordState] = useState<{
    tag: 'error' | 'warning' | 'success';
    label: string;
  } | null>(null);

  const formInputError = Object.values(errors)[0];

  let bottomInfoError: null | string = null;

  if (formInputError?.message) {
    bottomInfoError = formInputError.message;
  } else if (showError && signupError) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    bottomInfoError = signupError.toString();
  }

  useEffect(() => {
    const isAppSumo = navigationService.getCurrentView()?.id === AppView.AppSumo;

    if (isAppSumo && tokenParam && typeof tokenParam === 'string') {
      localStorageService.clear();
      localStorageService.set('xToken', tokenParam);
    }
  }, []);

  useEffect(() => {
    if (password.length > 0) onChangeHandler(password);
  }, [password]);

  function onChangeHandler(input: string) {
    const result = testPasswordStrength(input, (qs.email as string) === undefined ? '' : (qs.email as string));
    if (!result.valid) {
      setPasswordState({
        tag: 'error',
        label:
          result.reason === 'NOT_COMPLEX_ENOUGH'
            ? 'Password must contain at least one letter or symbol'
            : 'Password must be at least 8 characters long',
      });
    } else if (result.strength === 'medium') {
      setPasswordState({ tag: 'warning', label: 'Password is weak' });
    } else {
      setPasswordState({ tag: 'success', label: 'Password is strong' });
    }
  }

  const onSubmit: SubmitHandler<IFormValues> = async (formData) => {
    setIsLoading(true);

    try {
      const { email, password, token } = formData;

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
      /**
       * TODO: Move ANALYTICS ======
       */
      analyticsService.trackPaymentConversion();
      analyticsService.trackSignUp({
        userId: xUser.uuid,
        properties: {
          email: xUser.email,
          signup_source: signupCampaignSource(window.location.search),
        },
        traits: {
          email: xUser.email,
          first_name: xUser.name,
          last_name: xUser.lastname,
          usage: 0,
          createdAt: new Date().toISOString(),
          signup_device_source: signupDevicesource(window.navigator.userAgent),
          acquisition_channel: signupCampaignSource(window.location.search),
        },
      });

      // adtrack script
      window._adftrack = Array.isArray(window._adftrack)
        ? window._adftrack
        : window._adftrack
          ? [window._adftrack]
          : [];
      window._adftrack.push({
        HttpHost: 'track.adform.net',
        pm: 2370627,
        divider: encodeURIComponent('|'),
        pagename: encodeURIComponent('New'),
      });
      /**
       * ==========
       */

      window.top?.postMessage(
        'redirect',
        process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : 'https://internxt.com',
      );
    } catch (err: unknown) {
      setIsLoading(false);
      const castedError = errorService.castError(err);
      setSignupError(castedError.message);
    } finally {
      setShowError(true);
    }
  };

  async function getReCaptcha(formValues: IFormValues) {
    const grecaptcha = window.grecaptcha;

    grecaptcha.ready(() => {
      grecaptcha.execute(process.env.REACT_APP_RECAPTCHA_V3, { action: 'register' }).then((token) => {
        // Can't wait or token will expire
        formValues.token = token;
        if (passwordState != null && passwordState.tag != 'error') onSubmit(formValues);
      });
    });
  }

  return (
    <form className="flex w-full flex-col px-px" onSubmit={handleSubmit(getReCaptcha)}>
      <div className="mb-2.5 flex flex-col space-x-0 space-y-2 xs:flex-row xs:space-x-2.5 xs:space-y-0">
        <label className="space-y-1 xs:flex-1">
          <span>Email</span>
          <TextInput
            className="flex-1"
            placeholder="Email"
            label="email"
            type="email"
            disabled={hasEmailParam}
            register={register}
            required={true}
            minLength={{ value: 1, message: 'Email must not be empty' }}
            autoFocus={true}
            error={errors.email}
          />
        </label>

        <label className="space-y-1 xs:flex-1">
          <span>Password</span>
          <PasswordInput
            className="flex-1"
            placeholder="Password"
            label="password"
            register={register}
            required={true}
            error={errors.password}
          />
        </label>
      </div>

      {(bottomInfoError || passwordState?.tag === 'error') && (
        <div className="mb-1.5 -mt-1 flex w-full flex-row items-start">
          <div className="flex h-5 flex-row items-center">
            <WarningCircle weight="fill" className="mr-1 h-4 text-red-std" />
          </div>
          <span className="font-base w-full text-sm text-red-60">
            {passwordState?.tag === 'error' ? passwordState.label : bottomInfoError}
          </span>
        </div>
      )}

      <div className="flex flex-col items-start xs:flex-row xs:items-center">
        <Button
          disabled={isLoading}
          text="Get started"
          disabledText={isValid ? 'Encrypting...' : 'Get started'}
          loading={isLoading}
          style="button-primary-rounded"
          rightIcon={<ArrowRight className="h-6 w-6" />}
        />

        <span className="mt-2 text-xs text-gray-50 xs:ml-4 xs:mt-0">
          By creating an Internxt account you <br className="hidden xs:flex" />
          accept Internxt’s{' '}
          <a href="https://internxt.com/legal" target="_blank" className=" text-gray-60 hover:text-gray-80">
            Terms and Conditions
          </a>
          .
        </span>
      </div>
    </form>
  );
}

export default SignUpWebsite;
