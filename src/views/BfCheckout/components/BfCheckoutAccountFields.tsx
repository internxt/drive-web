import { EyeIcon, EyeSlashIcon, LockKeyIcon } from '@phosphor-icons/react';
import { Avatar } from '@internxt/ui';
import { useState } from 'react';
import { FieldErrors, UseFormRegister } from 'react-hook-form';
import { IFormValues } from 'app/core/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { MAX_PASSWORD_LENGTH } from 'components/ValidPassword';
import { AuthMethodTypes } from 'views/Checkout/types';
import { BF_CHECKOUT_INPUT_CLASSNAME } from '../constants';
import { UserInfoProps } from '../types';

interface BfCheckoutAccountFieldsProps {
  authMethod: AuthMethodTypes;
  errors: FieldErrors<IFormValues>;
  register: UseFormRegister<IFormValues>;
  userData: UserInfoProps;
  authError?: string;
  onAuthMethodToggled: (authMethod: AuthMethodTypes) => void;
  onLogOut: () => void;
}

const FieldLabel = ({ children }: { children: string }) => <p className="text-sm text-[#A7B4C8]">{children}</p>;

export const BfCheckoutAccountFields = ({
  authMethod,
  errors,
  register,
  userData,
  authError,
  onAuthMethodToggled,
  onLogOut,
}: BfCheckoutAccountFieldsProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);

  const isUserSignedIn = authMethod === 'userIsSignedIn';
  const isSignUp = authMethod === 'signUp';

  const preventSubmitOnEnter = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
    }
  };

  if (isUserSignedIn) {
    return (
      <div className="flex flex-row items-center justify-between gap-4 rounded-xl border border-[#202D45] bg-[#0A1120] p-4">
        <div className="flex min-w-0 flex-row items-center gap-3">
          <Avatar diameter={36} fullName={userData.name} src={userData.avatar ?? null} />
          <div className="flex min-w-0 flex-col">
            <p className="truncate text-sm font-semibold text-white">{userData.name}</p>
            <p className="truncate text-sm text-[#A7B4C8]">{userData.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogOut}
          className="shrink-0 rounded-lg border border-[#2F3F5C] px-3 py-2 text-sm font-medium text-white hover:bg-[#16213A]"
        >
          {translate('actions.logOut')}
        </button>
      </div>
    );
  }

  return (
    <div role="none" onKeyDown={preventSubmitOnEnter} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <FieldLabel>{translate('checkout.bfCheckout.form.emailLabel')}</FieldLabel>
        <input
          type="email"
          autoComplete="email"
          placeholder={translate('checkout.bfCheckout.form.emailPlaceholder')}
          className={BF_CHECKOUT_INPUT_CLASSNAME}
          {...register('email', {
            required: true,
            minLength: { value: 1, message: translate('checkout.authComponent.emailMustNotBeEmpty') },
          })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel>
          {isSignUp
            ? translate('checkout.bfCheckout.form.createPasswordLabel')
            : translate('checkout.bfCheckout.form.passwordLabel')}
        </FieldLabel>
        <div className="relative">
          <input
            type={isPasswordVisible ? 'text' : 'password'}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            placeholder={translate('checkout.bfCheckout.form.passwordPlaceholder')}
            className={`${BF_CHECKOUT_INPUT_CLASSNAME} pr-12`}
            {...register('password', { required: true, maxLength: MAX_PASSWORD_LENGTH })}
          />
          <button
            type="button"
            aria-label={translate('checkout.bfCheckout.form.togglePasswordVisibility')}
            onClick={() => setIsPasswordVisible(!isPasswordVisible)}
            className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center justify-center text-[#A7B4C8]"
          >
            {isPasswordVisible ? <EyeIcon size={20} /> : <EyeSlashIcon size={20} />}
          </button>
        </div>
      </div>

      {(authError || errors.email || errors.password) && (
        <p id="authError" className="text-sm text-red">
          {authError ?? translate('checkout.bfCheckout.form.incompleteDetails')}
        </p>
      )}

      <div className="flex flex-row items-start gap-3 rounded-xl border border-[#1E5B36] bg-[#0E2B1B] p-4">
        <LockKeyIcon size={24} weight="fill" className="shrink-0 text-[#3BD16F]" />
        <div className="flex flex-col">
          <p className="text-sm font-semibold text-[#3BD16F]">{translate('checkout.bfCheckout.form.encryptedTitle')}</p>
          <p className="text-sm text-[#A7B4C8]">{translate('checkout.bfCheckout.form.encryptedDescription')}</p>
        </div>
      </div>

      <div className="flex flex-row flex-wrap gap-2 text-sm">
        <p className="text-[#A7B4C8]">
          {isSignUp ? translate('auth.signup.haveAccount') : translate('auth.login.dontHaveAccount')}
        </p>
        <button
          type="button"
          onClick={() => onAuthMethodToggled(isSignUp ? 'signIn' : 'signUp')}
          className="cursor-pointer text-[#4D9BFF] hover:underline"
        >
          {isSignUp ? translate('auth.signup.login') : translate('auth.login.createAccount')}
        </button>
      </div>
    </div>
  );
};
