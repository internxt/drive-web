import { useState, useEffect } from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import queryString from 'query-string';
import { auth } from '@internxt/lib';
import { Link } from 'react-router-dom';
import { WarningCircle } from 'phosphor-react';

import localStorageService from 'app/core/services/local-storage.service';
// import analyticsService, { signupDevicesource, signupCampaignSource } from 'app/analytics/services/analytics.service';

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
import PasswordStrengthIndicator from 'app/shared/components/PasswordStrengthIndicator';
import { useSignUp } from './useSignUp';
import analyticsService from 'app/analytics/services/analytics.service';

export interface SignUpProps {
  location: {
    search: string;
  };
  isNewUser: boolean;
}

function SignUp(props: SignUpProps): JSX.Element {
  const qs = queryString.parse(navigationService.history.location.search);
  const hasReferrer = !!qs.ref;
  const { updateInfo, doRegister } = useSignUp(
    qs.register === 'activate' ? 'activate' : 'appsumo',
    hasReferrer ? String(qs.ref) : undefined,
  );
  const hasEmailParam = (qs.email && auth.isValidEmail(qs.email as string)) || false;
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

  const [showPasswordIndicator, setShowPasswordIndicator] = useState(false);

  const formInputError = Object.values(errors)[0];

  let bottomInfoError: null | string = null;

  if (formInputError?.message) {
    bottomInfoError = formInputError.message;
  } else if (showError && signupError) {
    bottomInfoError = signupError.toString();
  }

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
            ? 'Password is not complex enough'
            : 'Password has to be at least 8 characters long',
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
      const { isNewUser } = props;
      const { email, password, token } = formData;
      const { xUser, xToken, mnemonic } = isNewUser
        ? await doRegister(email, password, token)
        : await updateInfo(email, password);
      localStorageService.set('xToken', xToken);
      localStorageService.set('xMnemonic', mnemonic);

      dispatch(userActions.setUser(xUser));
      await dispatch(userThunks.initializeUserThunk());
      dispatch(productsThunks.initializeThunk());
      dispatch(planThunks.initializeThunk());

      if (isNewUser) {
        dispatch(referralsThunks.initializeThunk());
      }

      analyticsService.trackSignUp(email, xUser.userId);

      // analyticsService.trackPaymentConversion();
      // analyticsService.trackSignUp({
      //   userId: xUser.uuid,
      //   properties: {
      //     email: xUser.email,
      //     signup_source: signupCampaignSource(window.location.search),
      //   },
      //   traits: {
      //     email: xUser.email,
      //     first_name: xUser.name,
      //     last_name: xUser.lastname,
      //     usage: 0,
      //     createdAt: new Date().toISOString(),
      //     signup_device_source: signupDevicesource(window.navigator.userAgent),
      //     acquisition_channel: signupCampaignSource(window.location.search),
      //   },
      // });

      // adtrack script
      // window._adftrack = Array.isArray(window._adftrack)
      //   ? window._adftrack
      //   : window._adftrack
      //   ? [window._adftrack]
      //   : [];
      // window._adftrack.push({
      //   HttpHost: 'track.adform.net',
      //   pm: 2370627,
      //   divider: encodeURIComponent('|'),
      //   pagename: encodeURIComponent('New'),
      // });

      navigationService.push(AppView.Drive);
    } catch (err: unknown) {
      console.log(err);
      setIsLoading(false);
      const castedError = errorService.castError(err);
      setSignupError(castedError.message);
    } finally {
      setShowError(true);
    }
  };

  // async function getReCaptcha(formValues: IFormValues) {
  //   const grecaptcha = window.grecaptcha;

  //   grecaptcha.ready(() => {
  //     grecaptcha.execute(process.env.REACT_APP_RECAPTCHA_V3, { action: 'register' }).then((token) => {
  //       // Can't wait or token will expire
  //       formValues.token = token;
  //       if (passwordState != null && passwordState.tag != 'error') onSubmit(formValues);
  //     });
  //   });
  // }

  return (
    <div className="flex h-fit w-96 flex-col items-center justify-center rounded-2xl bg-white px-8 py-10 sm:shadow-soft">
      <form className="flex w-full flex-col space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <span className="text-2xl font-medium">Create account</span>

        <div className="flex flex-col space-y-3">
          <label className="space-y-0.5">
            <span>Email</span>
            <TextInput
              placeholder="Email"
              label="email"
              type="email"
              disabled={hasEmailParam}
              register={register}
              required={true}
              minLength={{ value: 1, message: 'Email must not be empty' }}
              error={errors.email}
            />
          </label>

          <label className="space-y-0.5">
            <span>Password</span>
            <PasswordInput
              className={passwordState ? passwordState.tag : ''}
              placeholder="Password"
              label="password"
              register={register}
              onFocus={() => setShowPasswordIndicator(true)}
              required={true}
              error={errors.password}
            />
            {showPasswordIndicator && passwordState && (
              <PasswordStrengthIndicator className="pt-1" strength={passwordState.tag} label={passwordState.label} />
            )}
            {bottomInfoError && (
              <div className="flex flex-row items-start pt-1">
                <div className="flex h-5 flex-row items-center">
                  <WarningCircle weight="fill" className="mr-1 h-4 text-red-std" />
                </div>
                <span className="font-base w-56 text-sm text-red-60">{bottomInfoError}</span>
              </div>
            )}
          </label>

          <Button
            disabled={isLoading}
            text="Create account"
            disabledText={isValid ? 'Encrypting...' : 'Create account'}
            loading={isLoading}
            style="button-primary"
            className="w-full"
          />
        </div>
      </form>
      <span className="mt-2 w-full text-xs text-gray-50">
        By creating an account you accept the{' '}
        <a href="https://internxt.com/legal" target="_blank" className="text-xs text-gray-50 hover:text-gray-80">
          terms and conditions
        </a>
      </span>

      <div className="mt-4 flex w-full items-center justify-center">
        <span className="select-none text-sm text-gray-80">
          Already have an account?{' '}
          <Link
            to="/login"
            className="cursor-pointer appearance-none text-center text-sm font-medium text-primary no-underline hover:text-primary focus:text-primary-dark"
          >
            Log in
          </Link>
        </span>
      </div>
    </div>
  );
}

export default SignUp;
