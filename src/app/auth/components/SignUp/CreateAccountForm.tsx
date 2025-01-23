import { Info, WarningCircle } from '@phosphor-icons/react';
import PasswordInput from 'app/auth/components/PasswordInput/PasswordInput';
import TextInput from 'app/auth/components/TextInput/TextInput';
import { Button } from '@internxt/ui';
import PasswordStrengthIndicator from 'app/shared/components/PasswordStrengthIndicator';
import { ReactComponent as InternxtLogo } from 'assets/icons/big-logo.svg';
import { Helmet } from 'react-helmet-async';
import { MAX_PASSWORD_LENGTH } from '../../../shared/components/ValidPassword';

const CreateAccountForm = ({
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
          <link rel="canonical" href={`${process.env.REACT_APP_HOSTNAME}/shared-guest`} />
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

                <label className="space-y-0.5">
                  <PasswordInput
                    className={passwordState ? passwordState.tag : ''}
                    placeholder={translate('auth.password')}
                    label="password"
                    maxLength={MAX_PASSWORD_LENGTH}
                    register={register}
                    onFocus={() => setShowPasswordIndicator(true)}
                    required={true}
                    error={errors.password}
                  />
                  {showPasswordIndicator && passwordState && (
                    <PasswordStrengthIndicator
                      className="pt-1"
                      strength={passwordState.tag}
                      label={passwordState.label}
                    />
                  )}
                  {bottomInfoError && (
                    <div className="flex flex-row items-start pt-1">
                      <div className="flex h-5 flex-row items-center">
                        <WarningCircle weight="fill" className="mr-1 h-4 text-red" />
                      </div>
                      <span className="font-base w-56 text-sm text-red">{bottomInfoError}</span>
                    </div>
                  )}
                </label>

                <div className="flex space-x-2.5 rounded-lg bg-primary/10 p-3 pr-4 dark:bg-primary/20">
                  <Info size={20} className="shrink-0 text-primary" />
                  <p className="text-xs">
                    {translate('auth.signup.info.normalText')}{' '}
                    <span className="font-semibold">{translate('auth.signup.info.boldText')}</span>{' '}
                    <span className="font-semibold text-primary underline">
                      <a
                        href="https://help.internxt.com/en/articles/8450457-how-do-i-create-a-backup-key"
                        target="_blank"
                      >
                        {translate('auth.signup.info.cta')}
                      </a>
                    </span>
                  </p>
                </div>

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
