import { Info, WarningCircle } from '@phosphor-icons/react';
import PasswordStrengthIndicator from 'app/shared/components/PasswordStrengthIndicator';
import PasswordInput from '../PasswordInput/PasswordInput';
import TextInput from '../TextInput/TextInput';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import { IFormValues } from 'app/core/types';
import queryString from 'query-string';
import navigationService from 'app/core/services/navigation.service';
import { auth } from '@internxt/lib';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useEffect, useState } from 'react';
import { MAX_PASSWORD_LENGTH } from '../../../shared/components/ValidPassword';
import testPasswordStrength from '@internxt/lib/dist/src/auth/testPasswordStrength';
import Button from 'app/shared/components/Button/Button';
import { Link } from 'react-router-dom';

interface SignupFormProps {
  autoSubmit?: {
    enabled: boolean;
    credentials?: {
      email: string;
      password: string;
      redeemCodeObject?: {
        code: string;
        provider: string;
      };
    };
  };
  onSubmit: SubmitHandler<IFormValues>;
  showError: boolean;
  signupError?: Error | string;
  isLoading: boolean;
}

const SignupForm = ({ autoSubmit, onSubmit, showError, signupError, isLoading }: SignupFormProps) => {
  const { translate } = useTranslationContext();
  const [showPasswordIndicator, setShowPasswordIndicator] = useState(false);
  const [passwordState, setPasswordState] = useState<{
    tag: 'error' | 'warning' | 'success';
    label: string;
  } | null>(null);
  const [isValidPassword, setIsValidPassword] = useState(false);

  let bottomInfoError: null | string = null;

  const qs = queryString.parse(navigationService.history.location.search);
  const hasEmailParam = (qs.email && auth.isValidEmail(qs.email as string)) || false;

  const getInitialEmailValue = () => {
    if (hasEmailParam) {
      return qs.email as string;
    }

    if (autoSubmit && autoSubmit.enabled && autoSubmit.credentials?.email) {
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
      password: autoSubmit && autoSubmit.enabled && autoSubmit.credentials ? autoSubmit.credentials.password : '',
    },
  });
  const password = useWatch({ control, name: 'password', defaultValue: '' });
  const formInputError = Object.values(errors)[0];

  useEffect(() => {
    if (autoSubmit && autoSubmit.enabled && autoSubmit.credentials) {
      onSubmit(getValues());
    }
  }, []);

  useEffect(() => {
    if (password.length > 0) onChangeHandler(password);
  }, [password]);

  function onChangeHandler(input: string) {
    setIsValidPassword(false);
    if (input.length > MAX_PASSWORD_LENGTH) {
      setPasswordState({ tag: 'error', label: translate('modals.changePasswordModal.errors.longPassword') });
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

  if (formInputError?.message) {
    bottomInfoError = formInputError.message;
  } else if (showError && signupError) {
    bottomInfoError = signupError.toString();
  }

  const getLoginLink = () => {
    const currentParams = new URLSearchParams(window.location.search);

    return currentParams.toString() ? '/login?' + currentParams.toString() : '/login';
  };

  return (
    <>
      <h1 className="text-3xl font-medium">{translate('auth.signup.title')}</h1>

      <form className="flex w-full flex-col space-y-2" onSubmit={handleSubmit(onSubmit)}>
        <TextInput
          placeholder={translate('auth.email') as string}
          label="email"
          type="email"
          disabled={hasEmailParam}
          autoComplete="email"
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
            autoComplete="new-password"
            maxLength={MAX_PASSWORD_LENGTH}
            register={register}
            onFocus={() => setShowPasswordIndicator(true)}
            required={true}
            error={errors.password}
          />
          {showPasswordIndicator && passwordState && password && (
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

        <Button type="submit" variant="primary" loading={isLoading} disabled={isLoading || !isValidPassword}>
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
    </>
  );
};

export default SignupForm;
