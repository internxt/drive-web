/* eslint-disable quotes */
import PasswordInput from 'app/auth/components/PasswordInput/PasswordInput';
import TextInput from 'app/auth/components/TextInput/TextInput';
import PasswordStrengthIndicator from 'app/shared/components/PasswordStrengthIndicator';
import { MAX_PASSWORD_LENGTH } from 'app/shared/components/ValidPassword';
import { AuthMethodTypes, PasswordStateProps } from '../types';
import { FieldErrors, UseFormRegister } from 'react-hook-form';
import { IFormValues } from 'app/core/types';
import Avatar from 'app/shared/components/Avatar';
import Button from 'app/shared/components/Button/Button';

interface CreateAccountComponentProps {
  authMethod: AuthMethodTypes;
  onAuthMethodToggled: (authMethod: AuthMethodTypes) => void;
  errors: FieldErrors<IFormValues>;
  register: UseFormRegister<IFormValues>;
  passwordState: PasswordStateProps | null;
  setShowPasswordIndicator: (passwordIndicator: boolean) => void;
  showPasswordIndicator: boolean;
  userData: {
    name: string;
    avatar: Blob | null;
  };
  onLogOut: () => void;
}

const InputsComponent = ({ register, errors, setShowPasswordIndicator, showPasswordIndicator, passwordState }) => {
  return (
    <>
      <TextInput
        placeholder={'Email'}
        label="email"
        type="email"
        disabled={false}
        register={register}
        required={true}
        minLength={{ value: 1, message: 'Email must not be empty' }}
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
      <p className="text-sm font-medium text-gray-50">
        Privacy guarantee: We do not share your information and will contact you only as needed to provide our service.
      </p>
    </>
  );
};

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
  const TITLE_LABEL: Record<AuthMethodTypes, string> = {
    signUp: 'Create an account',
    signIn: 'Log In',
    userIsSignedIn: 'User signed in as',
  };

  const AUTH_LABEL: Partial<Record<AuthMethodTypes, string>> = {
    signIn: "Don't have an account?",
    signUp: 'Already have an account?',
  };

  const AUTH_BUTTON_LABEL: Partial<Record<AuthMethodTypes, string>> = {
    signIn: 'Sign up',
    signUp: 'Log in',
  };

  return (
    <div className="flex flex-col space-y-8">
      <p className="text-2xl font-semibold text-gray-100">1. {TITLE_LABEL[authMethod]}</p>
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
            {AUTH_BUTTON_LABEL[authMethod]}
          </button>
        </div>
      )}
    </div>
  );
};
