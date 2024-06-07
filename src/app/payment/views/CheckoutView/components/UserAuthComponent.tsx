/* eslint-disable quotes */
import { AuthMethodTypes, PasswordStateProps } from '../types';
import { FieldErrors, UseFormRegister } from 'react-hook-form';
import { IFormValues } from 'app/core/types';
import Avatar from 'app/shared/components/Avatar';
import Button from 'app/shared/components/Button/Button';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { InputsComponent } from './InputsComponent';

interface CreateAccountComponentProps {
  userData: {
    name: string;
    avatar: Blob | null;
  };
  authMethod: AuthMethodTypes;
  passwordState: PasswordStateProps | null;
  errors: FieldErrors<IFormValues>;
  showPasswordIndicator: boolean;
  onAuthMethodToggled: (authMethod: AuthMethodTypes) => void;
  register: UseFormRegister<IFormValues>;
  setShowPasswordIndicator: (passwordIndicator: boolean) => void;
  onLogOut: () => void;
}

export const UserAuthComponent = ({
  register,
  errors,
  passwordState,
  setShowPasswordIndicator,
  showPasswordIndicator,
  authMethod,
  onAuthMethodToggled,
  userData,
  onLogOut,
}: CreateAccountComponentProps) => {
  const { translate } = useTranslationContext();

  const AUTH_LABEL: Partial<Record<AuthMethodTypes, string>> = {
    signIn: translate('auth.login.dontHaveAccount'),
    signUp: translate('auth.signup.haveAccount'),
  };

  const CHANGE_AUTH_METHOD: Partial<Record<AuthMethodTypes, string>> = {
    signIn: translate('auth.login.createAccount'),
    signUp: translate('auth.signup.login'),
  };

  return (
    <div className="flex flex-col space-y-8">
      <p className="text-2xl font-semibold text-gray-100">
        1. {translate(`checkout.authComponent.title.${authMethod}`)}
      </p>
      <div className="flex flex-col space-y-4 rounded-2xl bg-surface p-5">
        {authMethod === 'userIsSignedIn' ? (
          <div className="flex w-full items-center justify-center">
            <div className="flex flex-col items-center gap-2.5">
              <Avatar
                diameter={42}
                fullName={userData.name}
                src={userData.avatar ? URL.createObjectURL(userData.avatar) : null}
              />
              <span className="flex items-center text-lg font-semibold">{userData.name}</span>
              <Button onClick={onLogOut}>Log out</Button>
            </div>
          </div>
        ) : (
          <InputsComponent
            errors={errors}
            passwordState={passwordState}
            register={register}
            setShowPasswordIndicator={setShowPasswordIndicator}
            showPasswordIndicator={showPasswordIndicator}
          />
        )}
      </div>
      {authMethod !== 'userIsSignedIn' && (
        <div className="flex flex-row space-x-2">
          <p className="text-gray-100">{AUTH_LABEL[authMethod]}</p>
          <button
            onClick={() => {
              onAuthMethodToggled('signIn');
            }}
            className="cursor-pointer text-primary"
          >
            {CHANGE_AUTH_METHOD[authMethod]}
          </button>
        </div>
      )}
    </div>
  );
};
