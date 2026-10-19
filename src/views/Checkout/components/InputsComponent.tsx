import PasswordInput from 'components/PasswordInput';
import TextInput from 'components/TextInput';
import { IFormValues } from 'app/core/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { AuthMethodTypes } from '../types';
import { MAX_PASSWORD_LENGTH } from 'components/ValidPassword';
import { FieldErrors, UseFormRegister } from 'react-hook-form';

interface InputsComponentProps {
  errors: FieldErrors<IFormValues>;
  authError?: string;
  authMethod: AuthMethodTypes;
  register: UseFormRegister<IFormValues>;
  isPasswordFieldVisible?: boolean;
  onAuthMethodToggled: (authMethod: AuthMethodTypes) => void;
}

export const InputsComponent = ({
  register,
  errors,
  authError,
  authMethod,
  isPasswordFieldVisible = true,
  onAuthMethodToggled,
}: InputsComponentProps) => {
  const { translate } = useTranslationContext();

  const AUTH_LABEL: Partial<Record<AuthMethodTypes, string>> = {
    signIn: translate('auth.login.dontHaveAccount'),
    signUp: translate('auth.signup.haveAccount'),
  };

  const CHANGE_AUTH_METHOD_TEXT: Partial<Record<AuthMethodTypes, string>> = {
    signIn: translate('auth.login.createAccount'),
    signUp: translate('auth.signup.login'),
  };

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

      {isPasswordFieldVisible && (
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
      )}
      <div className="flex flex-row space-x-2 text-sm">
        <p className="text-gray-100">{AUTH_LABEL[authMethod]}</p>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            const newAuthMethod = authMethod === 'signIn' ? 'signUp' : 'signIn';
            onAuthMethodToggled(newAuthMethod);
          }}
          className="cursor-pointer text-primary"
        >
          {CHANGE_AUTH_METHOD_TEXT[authMethod]}
        </button>
      </div>
      {authError && (
        <div id="authError" className="text-red-dark">
          {authError}
        </div>
      )}
    </>
  );
};
