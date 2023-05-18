import { useState, useEffect, useMemo } from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import queryString from 'query-string';
import { auth } from '@internxt/lib';
import { Link } from 'react-router-dom';
import { WarningCircle } from 'phosphor-react';

import localStorageService, { STORAGE_KEYS } from 'app/core/services/local-storage.service';
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
import { validateFormat } from 'app/crypto/services/keys.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import authService, { getNewToken } from 'app/auth/services/auth.service';
import PreparingWorkspaceAnimation from '../PreparingWorkspaceAnimation/PreparingWorkspaceAnimation';

const MAX_PASSWORD_LENGTH = 20;

export interface SignUpProps {
  location: {
    search: string;
  };
  isNewUser: boolean;
}

function SignUp(props: SignUpProps): JSX.Element {
  const { translate } = useTranslationContext();
  const [isValidPassword, setIsValidPassword] = useState(false);

  const qs = queryString.parse(navigationService.history.location.search);
  const autoSubmit = useMemo(
    () => authService.extractOneUseCredentialsForAutoSubmit(new URLSearchParams(window.location.search)),
    [],
  );
  const hasReferrer = !!qs.ref;
  const { updateInfo, doRegister } = useSignUp(
    qs.register === 'activate' ? 'activate' : 'appsumo',
    hasReferrer ? String(qs.ref) : undefined,
  );
  const hasEmailParam = (qs.email && auth.isValidEmail(qs.email as string)) || false;

  const getInitialEmailValue = () => {
    if (hasEmailParam) {
      return qs.email as string;
    }

    if (autoSubmit.enabled && autoSubmit.credentials?.email) {
      return autoSubmit.credentials.email;
    }
  };
  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    control,
    getValues,
  } = useForm<IFormValues>({
    mode: 'onChange',
    defaultValues: {
      email: getInitialEmailValue(),
      password: autoSubmit.enabled && autoSubmit.credentials ? autoSubmit.credentials.password : '',
    },
  });
  const dispatch = useAppDispatch();
  const [planId, setPlanId] = useState<string>();
  const [mode, setMode] = useState<string>();
  const [coupon, setCouponCode] = useState<string>();
  const password = useWatch({ control, name: 'password', defaultValue: '' });
  const [signupError, setSignupError] = useState<Error | string>();
  const [showError, setShowError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordState, setPasswordState] = useState<{
    tag: 'error' | 'warning' | 'success';
    label: string;
  } | null>(null);
  const [showPasswordIndicator, setShowPasswordIndicator] = useState(false);
  const showPreparingWorkspaceAnimation = useMemo(() => autoSubmit.enabled && !showError, [autoSubmit, showError]);

  const formInputError = Object.values(errors)[0];

  let bottomInfoError: null | string = null;

  if (formInputError?.message) {
    bottomInfoError = formInputError.message;
  } else if (showError && signupError) {
    bottomInfoError = signupError.toString();
  }

  useEffect(() => {
    if (autoSubmit.enabled && autoSubmit.credentials) {
      onSubmit(getValues());
    }
  }, []);

  useEffect(() => {
    if (password.length > 0) onChangeHandler(password);
  }, [password]);

  useEffect(() => {
    const params = new URLSearchParams(navigationService.history.location.search);
    setPlanId(params.get('planId') !== undefined ? (params.get('planId') as string) : '');
    setMode(params.get('mode') !== undefined ? (params.get('mode') as string) : '');
    setCouponCode(params.get('couponCode') !== undefined ? (params.get('couponCode') as string) : '');
  }, []);

  function onChangeHandler(input: string) {
    setIsValidPassword(false);
    if (input.length > MAX_PASSWORD_LENGTH) {
      setPasswordState({ tag: 'error', label: 'Password is too long' });
      return;
    }

    const result = testPasswordStrength(input, (qs.email as string) === undefined ? '' : (qs.email as string));

    setIsValidPassword(result.valid);
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

  async function clearKey(privateKey: string, password: string) {
    const { privkeyDecrypted } = await validateFormat(privateKey, password);

    return Buffer.from(privkeyDecrypted).toString('base64');
  }

  const onSubmit: SubmitHandler<IFormValues> = async (formData, event) => {
    event?.preventDefault();
    setIsLoading(true);

    try {
      const { isNewUser } = props;
      const { email, password, token } = formData;
      const { xUser, xToken, mnemonic } = isNewUser
        ? await doRegister(email, password, token)
        : await updateInfo(email, password);

      localStorageService.removeItem(STORAGE_KEYS.SIGN_UP_TUTORIAL_COMPLETED);

      localStorageService.set('xToken', xToken);
      localStorageService.set('xMnemonic', mnemonic);

      const xNewToken = await getNewToken();
      localStorageService.set('xNewToken', xNewToken);

      const privateKey = xUser.privateKey ? await clearKey(xUser.privateKey, password) : undefined;

      const user = {
        ...xUser,
        privateKey,
      } as UserSettings;

      dispatch(userActions.setUser(user));
      await dispatch(userThunks.initializeUserThunk());
      dispatch(productsThunks.initializeThunk());
      dispatch(planThunks.initializeThunk());

      if (isNewUser) {
        dispatch(referralsThunks.initializeThunk());
      }

      window.rudderanalytics.identify(xUser.uuid, { email, uuid: xUser.uuid });
      window.rudderanalytics.track('User Signup', { email });

      const redirectUrl = authService.getRedirectUrl(new URLSearchParams(window.location.search), xToken);

      if (redirectUrl) {
        window.location.replace(redirectUrl);
        return;
      }
      if (planId && mode) {
        coupon
          ? window.location.replace(
              `https://drive.internxt.com/checkout-plan?planId=${planId}&couponCode=${coupon}&mode=${mode}`,
            )
          : window.location.replace(`https://drive.internxt.com/checkout-plan?planId=${planId}&mode=${mode}`);
      } else {
        navigationService.push(AppView.Drive);
      }
    } catch (err: unknown) {
      setIsLoading(false);
      errorService.reportError(err);
      const castedError = errorService.castError(err);
      setSignupError(castedError.message);
    } finally {
      setShowError(true);
    }
  };

  const getLoginLink = () => {
    const currentParams = new URLSearchParams(window.location.search);

    return currentParams.toString() ? '/login?' + currentParams.toString() : '/login';
  };
  return (
    <div
      className={`flex ${
        showPreparingWorkspaceAnimation
          ? 'h-full w-full'
          : 'h-fit w-96 flex-col items-center justify-center rounded-2xl bg-white px-8 py-10 sm:shadow-soft'
      }`}
    >
      {showPreparingWorkspaceAnimation ? (
        <PreparingWorkspaceAnimation />
      ) : (
        <>
          <form className="flex w-full flex-col space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <span className="text-2xl font-medium">{translate('auth.signup.title')}</span>

            <div className="flex flex-col space-y-3">
              <label className="space-y-0.5">
                <span>{translate('auth.email')}</span>
                <TextInput
                  placeholder={translate('auth.email') as string}
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
                <span>{translate('auth.password')}</span>
                <PasswordInput
                  className={passwordState ? passwordState.tag : ''}
                  placeholder={translate('auth.password')}
                  label="password"
                  maxLength={MAX_PASSWORD_LENGTH}
                  register={register}
                  onFocus={() => setShowPasswordIndicator(true)}
                  required={true}
                  error={errors.password}
                />
                {showPasswordIndicator && passwordState && (
                  <PasswordStrengthIndicator
                    className="pt-1"
                    strength={passwordState.tag}
                    label={passwordState.label}
                  />
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
                disabled={isLoading || !isValidPassword}
                text={translate('auth.signup.title')}
                disabledText={isValid && isValidPassword ? 'Encrypting...' : 'Create account'}
                loading={isLoading}
                style="button-primary"
                className="w-full"
              />
            </div>
          </form>
          <span className="mt-2 w-full text-xs text-gray-50">
            {translate('auth.terms1')}{' '}
            <a href="https://internxt.com/legal" target="_blank" className="text-xs text-gray-50 hover:text-gray-80">
              {translate('auth.terms2')}
            </a>
          </span>

          <div className="mt-4 flex w-full items-center justify-center">
            <span className="select-none text-sm text-gray-80">
              {translate('auth.signup.haveAccount')}{' '}
              <Link
                to={getLoginLink()}
                className="cursor-pointer appearance-none text-center text-sm font-medium text-primary no-underline hover:text-primary focus:text-primary-dark"
              >
                {translate('auth.signup.login')}
              </Link>
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default SignUp;
