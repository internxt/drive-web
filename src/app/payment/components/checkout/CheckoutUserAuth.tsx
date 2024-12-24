/* eslint-disable quotes */
import { AuthMethodTypes } from '../../types';
import { FieldErrors, UseFormRegister } from 'react-hook-form';
import { IFormValues } from 'app/core/types';
import { Button, Avatar } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { InputsComponent } from './InputsComponent';

interface CheckoutUserAuthProps {
  userData: {
    name: string;
    avatar: Blob | null;
    email?: string;
  };
  authMethod: AuthMethodTypes;
  authError?: string;
  errors: FieldErrors<IFormValues>;
  onAuthMethodToggled: (authMethod: AuthMethodTypes) => void;
  register: UseFormRegister<IFormValues>;
  onLogOut: () => void;
}

export const CheckoutUserAuth = ({
  register,
  errors,
  authMethod,
  authError,
  onAuthMethodToggled,
  userData,
  onLogOut,
}: CheckoutUserAuthProps) => {
  const { translate } = useTranslationContext();

  const isUserSignedIn = authMethod === 'userIsSignedIn';
  const isNotUserSignedIn = authMethod !== 'userIsSignedIn';

  const AUTH_LABEL: Partial<Record<AuthMethodTypes, string>> = {
    signIn: translate('auth.login.dontHaveAccount'),
    signUp: translate('auth.signup.haveAccount'),
  };

  const CHANGE_AUTH_METHOD_TEXT: Partial<Record<AuthMethodTypes, string>> = {
    signIn: translate('auth.login.createAccount'),
    signUp: translate('auth.signup.login'),
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  return (
    <div className="flex flex-col space-y-8">
      <p className="text-2xl font-semibold text-gray-100">
        1. {translate(`checkout.authComponent.title.${authMethod}`)}
      </p>
      <div
        onKeyDown={handleKeyDown}
        className="flex flex-col space-y-4 rounded-2xl border border-gray-10 bg-surface p-5"
      >
        {isUserSignedIn ? (
          <div className="flex w-full items-center justify-center">
            <div className="flex flex-col items-center gap-2.5">
              <Avatar
                diameter={42}
                fullName={userData.name}
                src={userData.avatar ? URL.createObjectURL(userData.avatar) : null}
              />
              <p className="text-lg font-semibold">{userData.name}</p>
              <p>{userData?.email}</p>
              <Button onClick={onLogOut}>{translate('actions.logOut')}</Button>
            </div>
          </div>
        ) : (
          <InputsComponent authError={authError} errors={errors} authMethod={authMethod} register={register} />
        )}
      </div>
      {isNotUserSignedIn ? (
        <div className="flex flex-row space-x-2">
          <p className="text-gray-100">{AUTH_LABEL[authMethod]}</p>
          <button
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
      ) : undefined}
    </div>
  );
};
