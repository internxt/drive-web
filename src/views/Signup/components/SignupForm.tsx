import { useState, useEffect, useMemo } from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import queryString from 'query-string';
import { auth } from '@internxt/lib';
import { Link } from 'react-router-dom';
import { Info, WarningCircle } from '@phosphor-icons/react';
import { Helmet } from 'react-helmet-async';

import { useAppDispatch } from '../../../app/store/hooks';
import { planThunks } from '../../../app/store/slices/plan';
import errorService from '../../../app/core/services/error.service';
import navigationService from '../../../app/core/services/navigation.service';
import { AppView, IFormValues } from '../../../app/core/types';
import TextInput from '../../../app/auth/components/TextInput/TextInput';
import PasswordInput from '../../../app/auth/components/PasswordInput/PasswordInput';
import testPasswordStrength from '@internxt/lib/dist/src/auth/testPasswordStrength';
import PasswordStrengthIndicator from '../../../app/shared/components/PasswordStrengthIndicator';
import { useSignUp } from '../hooks/useSignup';
import { useTranslationContext } from '../../../app/i18n/provider/TranslationProvider';
import authService, { authenticateUser } from '../../../app/auth/services/auth.service';
import PreparingWorkspaceAnimation from '../../../app/auth/components/PreparingWorkspaceAnimation/PreparingWorkspaceAnimation';
import paymentService from '../../../app/payment/services/payment.service';
import { MAX_PASSWORD_LENGTH } from '../../../app/shared/components/ValidPassword';
import { Button } from '@internxt/ui';
import { AuthMethodTypes } from '../../../app/payment/types';
import vpnAuthService from '../../../app/auth/services/vpnAuth.service';
import envService from '../../../app/core/services/env.service';

export interface SignUpProps {
  location: {
    search: string;
  };
}

type PasswordState = {
  tag: 'error' | 'warning' | 'success';
  label: string;
};

export type Views = 'signUp' | 'downloadBackupKey';

function SignUpForm(props: Readonly<SignUpProps>): JSX.Element {
  const { translate } = useTranslationContext();
  const [isValidPassword, setIsValidPassword] = useState(false);
  const [view] = useState<Views>('signUp');

  const qs = queryString.parse(navigationService.history.location.search);
  const autoSubmit = useMemo(
    () => authService.extractOneUseCredentialsForAutoSubmit(new URLSearchParams(globalThis.location.search)),
    [],
  );
  const { doRegister } = useSignUp(qs.register === 'activate' ? 'activate' : 'appsumo');
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
  const password = useWatch({ control, name: 'password', defaultValue: '' });
  const [signupError, setSignupError] = useState<Error | string>();
  const [showError, setShowError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordState, setPasswordState] = useState<PasswordState | null>(null);
  const [showPasswordIndicator, setShowPasswordIndicator] = useState(false);
  const showPreparingWorkspaceAnimation = useMemo(() => autoSubmit.enabled && !showError, [autoSubmit, showError]);

  const formInputError = Object.values(errors)[0];

  const getBottomInfoError = (): string | null => {
    if (formInputError?.message) return formInputError.message;
    if (showError && signupError) return signupError.toString();
    return null;
  };

  const bottomInfoError = getBottomInfoError();

  useEffect(() => {
    if (autoSubmit.enabled && autoSubmit.credentials) {
      onSubmit(getValues());
    }
  }, []);

  useEffect(() => {
    if (password.length > 0) onChangeHandler(password);
  }, [password]);

  const getValidPasswordState = (strength?: string): PasswordState => {
    return strength === 'medium'
      ? { tag: 'warning', label: 'Password is weak' }
      : { tag: 'success', label: 'Password is strong' };
  };

  const getInvalidPasswordState = (reason?: string): PasswordState => {
    const label =
      reason === 'NOT_COMPLEX_ENOUGH'
        ? 'Password is not complex enough'
        : 'Password has to be at least 8 characters long';
    return { tag: 'error', label };
  };

  const getPasswordState = (result: { valid: boolean; strength?: string; reason?: string }): PasswordState => {
    return result.valid ? getValidPasswordState(result.strength) : getInvalidPasswordState(result.reason);
  };

  const handlePasswordTooLong = (input: string): boolean => {
    if (input.length > MAX_PASSWORD_LENGTH) {
      setPasswordState({ tag: 'error', label: translate('modals.changePasswordModal.errors.longPassword') });
      return true;
    }
    return false;
  };

  const handleSubmitError = (err: unknown) => {
    setIsLoading(false);
    errorService.reportError(err);
    const castedError = errorService.castError(err);
    setSignupError(castedError.message);
  };

  const onChangeHandler = (input: string) => {
    setIsValidPassword(false);

    if (handlePasswordTooLong(input)) return;

    const result = testPasswordStrength(input, String(qs.email || ''));
    setIsValidPassword(result.valid);
    setPasswordState(getPasswordState(result));
  };

  const onSubmit: SubmitHandler<IFormValues> = async (formData, event) => {
    const redeemCodeObject = autoSubmit.credentials?.redeemCodeObject;
    event?.preventDefault();
    setIsLoading(true);

    try {
      const { email, password, token } = formData;

      const authParams = {
        email,
        password,
        authMethod: 'signUp' as AuthMethodTypes,
        twoFactorCode: '',
        dispatch,
        token,
        redeemCodeObject: redeemCodeObject !== undefined,
        doSignUp: doRegister,
      };

      const { token: xToken, newToken: xNewToken } = await authenticateUser(authParams);

      await redirectTheUserAfterRegistration(xToken, xNewToken, redeemCodeObject);
    } catch (err: unknown) {
      handleSubmitError(err);
    } finally {
      setShowError(true);
    }
  };

  const handleVPNAuth = (isVPNAuth: string | null, xNewToken: string) => {
    if (isVPNAuth && xNewToken) {
      vpnAuthService.logIn(xNewToken);
    }
  };

  const handleRedeemCode = async (redeemCodeObject: { code: string; provider: string }) => {
    await paymentService.redeemCode(redeemCodeObject);
    dispatch(planThunks.initializeThunk());
    navigationService.push(AppView.Drive);
  };

  const handleDefaultRedirect = (isUniversalLinkMode: boolean) => {
    const redirectView = isUniversalLinkMode ? AppView.UniversalLinkSuccess : AppView.Drive;
    return navigationService.push(redirectView);
  };

  const redirectTheUserAfterRegistration = async (
    xToken: string,
    xNewToken: string,
    redeemCodeObject?: {
      code: string;
      provider: string;
    },
  ) => {
    const urlParams = new URLSearchParams(globalThis.location.search);
    const isUniversalLinkMode = urlParams.get('universalLink') == 'true';
    const redirectUrl = authService.getRedirectUrl(urlParams, xToken);
    const isVPNAuth = urlParams.get('vpnAuth');

    handleVPNAuth(isVPNAuth, xNewToken);

    if (redirectUrl) {
      globalThis.location.replace(redirectUrl);
    } else if (redeemCodeObject) {
      await handleRedeemCode(redeemCodeObject);
    } else {
      return handleDefaultRedirect(isUniversalLinkMode);
    }
  };

  const getLoginLink = () => {
    const currentParams = new URLSearchParams(globalThis.location.search);

    return currentParams.toString() ? '/login?' + currentParams.toString() : '/login';
  };

  const renderContent = () => {
    if (showPreparingWorkspaceAnimation) {
      return <PreparingWorkspaceAnimation />;
    }

    if (view === 'downloadBackupKey') {
      //TODO: Use this component when we have to implement the download of the backup key
      // return <DownloadBackupKey onRedirect={onRedirect} />;
      return <></>;
    }

    return (
      <div className="flex flex-col items-start space-y-5">
        <h1 className="text-3xl font-medium">{translate('auth.signup.title')}</h1>

        <form className="flex w-full flex-col space-y-2" onSubmit={handleSubmit(onSubmit)}>
          <TextInput
            placeholder={translate('auth.email')}
            label="email"
            type="email"
            disabled={hasEmailParam}
            register={register}
            required={true}
            minLength={{ value: 1, message: 'Email must not be empty' }}
            error={errors.email}
          />

          <label className="space-y-0.5">
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
              <PasswordStrengthIndicator className="pt-1" strength={passwordState.tag} label={passwordState.label} />
            )}
            {bottomInfoError && (
              <div className="flex flex-row items-start pt-1">
                <div className="flex h-5 flex-row items-center">
                  <WarningCircle weight="fill" className="mr-1 h-4 text-red" />
                </div>
                <span className="font-base w-56 text-sm text-red">{bottomInfoError}</span>
              </div>
            )}
          </label>

          <div className="flex space-x-2.5 rounded-lg bg-primary/10 p-3 pr-4 dark:bg-primary/20">
            <Info size={20} className="shrink-0 text-primary" />
            <p className="text-xs">
              {translate('auth.signup.info.normalText')}{' '}
              <span className="font-semibold">{translate('auth.signup.info.boldText')}</span>{' '}
              <span className="font-semibold text-primary underline">
                <a href="https://help.internxt.com/en/articles/8450457-how-do-i-create-a-backup-key" target="_blank">
                  {translate('auth.signup.info.cta')}
                </a>
              </span>
            </p>
          </div>

          <Button
            disabled={isLoading || !isValidPassword}
            loading={isLoading}
            type="submit"
            variant="primary"
            className="w-full"
          >
            {isLoading && isValid && isValidPassword
              ? `${translate('auth.signup.encrypting')}...`
              : translate('auth.signup.title')}
          </Button>
        </form>

        <span className="mt-2 w-full text-xs text-gray-50">
          {translate('auth.terms1')}{' '}
          <a href="https://internxt.com/legal" target="_blank" className="text-xs text-gray-50 hover:text-gray-60">
            {translate('auth.terms2')}
          </a>
        </span>

        <div className="w-full border-b border-gray-10" />

        <div className="flex w-full items-center justify-center space-x-1.5 font-medium">
          <span>{translate('auth.signup.haveAccount')}</span>
          <Link
            to={getLoginLink()}
            className="cursor-pointer font-medium text-primary no-underline hover:text-primary focus:text-primary-dark"
          >
            {translate('auth.signup.login')}
          </Link>
        </div>
      </div>
    );
  };

  return (
    <>
      <Helmet>
        <link rel="canonical" href={`${envService.getVariable('hostname')}/new`} />
      </Helmet>
      <div
        className={`flex ${
          showPreparingWorkspaceAnimation
            ? 'h-full w-full'
            : 'h-fit w-96 flex-col items-center justify-center px-8 py-10'
        }`}
      >
        {renderContent()}
      </div>
    </>
  );
}

export default SignUpForm;
