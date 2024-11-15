import PasswordInput from 'app/auth/components/PasswordInput/PasswordInput';
import TextInput from 'app/auth/components/TextInput/TextInput';
import { IFormValues } from 'app/core/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { AuthMethodTypes } from 'app/payment/types';
import { MAX_PASSWORD_LENGTH } from 'app/shared/components/ValidPassword';
import { FieldErrors, UseFormRegister } from 'react-hook-form';

interface InputsComponentProps {
  errors: FieldErrors<IFormValues>;
  authError?: string;
  authMethod: AuthMethodTypes;
  register: UseFormRegister<IFormValues>;
}

export const InputsComponent = ({ register, errors, authError, authMethod }: InputsComponentProps) => {
  const { translate } = useTranslationContext();

  return (
    <>
      <div className="flex w-full flex-col gap-1">
        <p className="text-sm text-gray-80">{translate('checkout.authComponent.signUp.emailAddress')}</p>
        <TextInput
          placeholder={'Email'}
          label="email"
          type="email"
          register={register}
          required={true}
          minLength={{ value: 1, message: translate('checkout.authComponent.emailMustNotBeEmpty') }}
          error={errors.password}
        />
      </div>

      <div className="flex w-full flex-col gap-1">
        <p className="text-sm text-gray-80">{translate(`checkout.authComponent.${authMethod}.password`)}</p>
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
      </div>
      {authError && (
        <div id="authError" className="text-red-dark">
          {authError}
        </div>
      )}
      <p className="text-sm font-medium text-gray-50">{translate('checkout.authComponent.privacyGuarantee')}</p>
    </>
  );
};
