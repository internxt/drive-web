import { Button } from '@internxt/ui';
import { WarningCircle } from '@phosphor-icons/react';
import { IFormValues } from 'app/core/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import PasswordInput from 'components/PasswordInput';
import { MAX_PASSWORD_LENGTH } from 'components/ValidPassword';
import { useEffect, useState } from 'react';
import { isMobile } from 'react-device-detect';
import { useForm, useWatch } from 'react-hook-form';
import PasswordFieldWithInfo from 'views/Signup/components/PasswordFieldWithInfo';
import { PasswordState } from 'views/Signup/hooks/useGuestSignupState';
import { onChangePasswordHandler } from 'views/Signup/utils';

interface AccountSetupFormProps {
  isSubmitting: boolean;
  hasSubmitFailed: boolean;
  onSubmit: (password: string) => void;
}

const FieldError = ({ message }: Readonly<{ message: string }>): JSX.Element => (
  <div className="flex flex-row items-start pt-1">
    <div className="flex h-5 flex-row items-center">
      <WarningCircle weight="fill" className="mr-1 h-4 text-red" />
    </div>
    <span className="font-base text-sm text-red">{message}</span>
  </div>
);

export const AccountSetupForm = ({
  isSubmitting,
  hasSubmitFailed,
  onSubmit,
}: Readonly<AccountSetupFormProps>): JSX.Element => {
  const { translate } = useTranslationContext();
  const [isValidPassword, setIsValidPassword] = useState(false);
  const [passwordState, setPasswordState] = useState<PasswordState | null>(null);
  const [showPasswordIndicator, setShowPasswordIndicator] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<IFormValues>({ mode: 'onChange', defaultValues: { password: '', confirmPassword: '' } });
  const password = useWatch({ control, name: 'password', defaultValue: '' });
  const confirmPassword = useWatch({ control, name: 'confirmPassword', defaultValue: '' });

  useEffect(() => {
    if (password.length > 0) onChangePasswordHandler({ password, setIsValidPassword, setPasswordState });
  }, [password]);

  const doPasswordsMatch = password === confirmPassword;
  const isMismatchVisible = confirmPassword.length > 0 && !doPasswordsMatch;
  const canSubmit = isValidPassword && doPasswordsMatch && !isSubmitting;

  const submitPassword = (formData: IFormValues) => {
    if (canSubmit) onSubmit(formData.password);
  };

  return (
    <form className="flex w-full flex-col space-y-5" onSubmit={handleSubmit(submitPassword)}>
      <div className="flex flex-col space-y-1">
        <h1 className="text-3xl font-medium text-gray-100">{translate('accountSetup.form.title')}</h1>
        <p className="text-base text-gray-60">{translate('accountSetup.form.description')}</p>
      </div>

      <div className="flex flex-col space-y-3">
        <PasswordFieldWithInfo
          translate={translate}
          register={register}
          error={errors.password}
          passwordState={passwordState}
          setShowPasswordIndicator={setShowPasswordIndicator}
          showPasswordIndicator={showPasswordIndicator}
          bottomInfoError={null}
        />

        <label className="space-y-0.5">
          <PasswordInput
            placeholder={translate('accountSetup.form.confirmPassword')}
            label="confirmPassword"
            maxLength={MAX_PASSWORD_LENGTH}
            register={register}
            required={true}
            passwordError={isMismatchVisible}
          />
          {isMismatchVisible && <FieldError message={translate('accountSetup.form.passwordsDoNotMatch')} />}
        </label>

        <Button disabled={!canSubmit} loading={isSubmitting} variant="primary" className="w-full" type="submit">
          {isSubmitting ? `${translate('auth.signup.encrypting')}...` : translate('accountSetup.form.submit')}
        </Button>

        {hasSubmitFailed && <FieldError message={translate('accountSetup.form.genericError')} />}
      </div>

      <span className="w-full text-xs text-gray-50">
        {translate('auth.terms1')}{' '}
        {isMobile ? (
          <span className="text-xs text-gray-50">{translate('auth.terms2')}</span>
        ) : (
          <a href="https://internxt.com/legal" target="_blank" className="text-xs text-gray-50 hover:text-gray-60">
            {translate('auth.terms2')}
          </a>
        )}
      </span>
    </form>
  );
};
