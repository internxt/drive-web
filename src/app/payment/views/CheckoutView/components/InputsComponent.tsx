import PasswordInput from 'app/auth/components/PasswordInput/PasswordInput';
import TextInput from 'app/auth/components/TextInput/TextInput';
import { IFormValues } from 'app/core/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import PasswordStrengthIndicator from 'app/shared/components/PasswordStrengthIndicator';
import { MAX_PASSWORD_LENGTH } from 'app/shared/components/ValidPassword';
import { FieldErrors, UseFormRegister } from 'react-hook-form';
import { PasswordStateProps } from '../types';

interface InputsComponent {
  errors: FieldErrors<IFormValues>;
  register: UseFormRegister<IFormValues>;
  passwordState: PasswordStateProps | null;
  setShowPasswordIndicator: (passwordIndicator: boolean) => void;
  showPasswordIndicator: boolean;
}

export const InputsComponent = ({
  register,
  errors,
  setShowPasswordIndicator,
  showPasswordIndicator,
  passwordState,
}: InputsComponent) => {
  const { translate } = useTranslationContext();

  return (
    <>
      <TextInput
        placeholder={'Email'}
        label="email"
        type="email"
        disabled={false}
        register={register}
        required={true}
        minLength={{ value: 1, message: translate('checkout.authComponent.emailMustNotBeEmpty') }}
        error={errors.email}
      />

      <label className="space-y-0.5">
        <PasswordInput
          className={''}
          placeholder={'Password'}
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
      </label>
      <p className="text-sm font-medium text-gray-50">{translate('checkout.authComponent.privacyGuarantee')}</p>
    </>
  );
};
