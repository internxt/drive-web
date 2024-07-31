import PasswordInput from 'app/auth/components/PasswordInput/PasswordInput';
import TextInput from 'app/auth/components/TextInput/TextInput';
import { IFormValues } from 'app/core/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { MAX_PASSWORD_LENGTH } from 'app/shared/components/ValidPassword';
import { FieldErrors, UseFormRegister } from 'react-hook-form';

interface InputsComponentProps {
  errors: FieldErrors<IFormValues>;
  authError?: string;
  register: UseFormRegister<IFormValues>;
}

export const InputsComponent = ({ register, errors, authError }: InputsComponentProps) => {
  const { translate } = useTranslationContext();

  return (
    <>
      <TextInput
        placeholder={'Email'}
        label="email"
        type="email"
        register={register}
        required={true}
        minLength={{ value: 1, message: translate('checkout.authComponent.emailMustNotBeEmpty') }}
        error={errors.password}
      />

      <label className="space-y-0.5">
        <PasswordInput
          placeholder={'Password'}
          label="password"
          maxLength={MAX_PASSWORD_LENGTH}
          register={register}
          required={true}
          error={errors.password}
        />
      </label>
      {authError && <div className="text-red-dark">{authError}</div>}
      <p className="text-sm font-medium text-gray-50">{translate('checkout.authComponent.privacyGuarantee')}</p>
    </>
  );
};
