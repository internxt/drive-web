import TextInput from '../../../app/auth/components/TextInput/TextInput';
import { Button } from '@internxt/ui';
import InternxtLogo from '../../../assets/icons/big-logo.svg?react';
import PasswordFieldWithInfo from './PasswordFieldWithInfo';
import { Helmet } from 'react-helmet-async';
import envService from 'services/env.service';
import { FieldErrors, UseFormHandleSubmit, UseFormRegister } from 'react-hook-form';
import { IFormValues } from '../../../app/core/types';
import { PasswordState } from '../hooks/useGuestSignupState';

interface CreateAccountFormProps {
  handleSubmit: UseFormHandleSubmit<IFormValues>;
  onSubmit: (data: IFormValues, event?: React.BaseSyntheticEvent) => void;
  translate: (key: string) => string;
  hasEmailParam: boolean;
  register: UseFormRegister<IFormValues>;
  errors: FieldErrors<IFormValues>;
  passwordState: PasswordState | null;
  setShowPasswordIndicator: (show: boolean) => void;
  showPasswordIndicator: boolean;
  bottomInfoError: string | null;
  isLoading: boolean;
  isValidPassword: boolean;
  isValid: boolean;
}

const CreateAccountForm: React.FC<CreateAccountFormProps> = ({
  handleSubmit,
  onSubmit,
  translate,
  hasEmailParam,
  register,
  errors,
  passwordState,
  setShowPasswordIndicator,
  showPasswordIndicator,
  bottomInfoError,
  isLoading,
  isValidPassword,
  isValid,
}) => {
  return (
    <div className={'flex h-full w-full flex-col overflow-auto bg-surface dark:bg-gray-1'}>
      <div className="flex shrink-0 flex-row justify-center py-10 sm:justify-start sm:pl-20">
        <InternxtLogo className="h-auto w-28 text-gray-100" />
      </div>

      <div className={'flex h-full flex-col items-center justify-center'}>
        <Helmet>
          <link rel="canonical" href={`${envService.getVariable('hostname')}/shared-guest`} />
        </Helmet>
        <div className={'flex h-fit w-96 flex-col items-center justify-center rounded-2xl px-8 py-10'}>
          <div className="flex flex-col items-start space-y-5">
            <form className="flex w-full flex-col space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <h1 className="text-3xl font-medium">{translate('auth.signup.title')}</h1>
              <div className="flex flex-col space-y-3">
                <label className="space-y-0.5">
                  <TextInput
                    placeholder={translate('auth.email')}
                    label="email"
                    type="email"
                    disabled={hasEmailParam}
                    register={register}
                    required={true}
                    minLength={{ value: 1, message: translate('notificationMessages.emailNotEmpty') }}
                    error={errors.email}
                  />
                </label>

                <PasswordFieldWithInfo
                  translate={translate}
                  register={register}
                  error={errors.password}
                  passwordState={passwordState}
                  setShowPasswordIndicator={setShowPasswordIndicator}
                  showPasswordIndicator={showPasswordIndicator}
                  bottomInfoError={bottomInfoError}
                />

                <Button
                  disabled={isLoading || !isValidPassword}
                  loading={isLoading}
                  variant="primary"
                  className="w-full"
                  type="submit"
                >
                  {isLoading && isValid && isValidPassword
                    ? `${translate('auth.signup.encrypting')}...`
                    : translate('auth.signup.title')}
                </Button>
              </div>
              <span className="mt-2 w-full text-xs text-gray-50">
                {translate('auth.terms1')}{' '}
                <a
                  href="https://internxt.com/legal"
                  target="_blank"
                  className="text-xs text-gray-50 hover:text-gray-60"
                >
                  {translate('auth.terms2')}
                </a>
              </span>
            </form>
          </div>
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-row justify-center py-8">
        <a
          href="https://internxt.com/legal"
          target="_blank"
          className="font-regular mr-4 mt-6 text-base text-gray-80 no-underline hover:text-gray-100"
        >
          {translate('general.terms')}
        </a>
        <a
          href="https://help.internxt.com"
          target="_blank"
          className="font-regular mr-4 mt-6 text-base text-gray-80 no-underline hover:text-gray-100"
        >
          {translate('general.help')}
        </a>
      </div>
    </div>
  );
};

export default CreateAccountForm;
