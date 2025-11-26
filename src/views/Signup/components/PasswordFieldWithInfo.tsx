import { Info, WarningCircle } from '@phosphor-icons/react';
import PasswordInput from 'components/PasswordInput';
import PasswordStrengthIndicator from 'components/PasswordStrengthIndicator';
import { MAX_PASSWORD_LENGTH } from 'components/ValidPassword';
import { FieldError, UseFormRegister } from 'react-hook-form';
import { IFormValues } from '../../../app/core/types';
import { PasswordState } from '../hooks/useGuestSignupState';

interface PasswordFieldWithInfoProps {
  translate: (key: string) => string;
  register: UseFormRegister<IFormValues>;
  error?: FieldError;
  passwordState: PasswordState | null;
  setShowPasswordIndicator: (show: boolean) => void;
  showPasswordIndicator: boolean;
  bottomInfoError: string | null;
}

const PasswordFieldWithInfo: React.FC<PasswordFieldWithInfoProps> = ({
  translate,
  register,
  error,
  passwordState,
  setShowPasswordIndicator,
  showPasswordIndicator,
  bottomInfoError,
}) => {
  return (
    <>
      <label className="space-y-0.5">
        <PasswordInput
          className={passwordState ? passwordState.tag : ''}
          placeholder={translate('auth.password')}
          label="password"
          maxLength={MAX_PASSWORD_LENGTH}
          register={register}
          onFocus={() => setShowPasswordIndicator(true)}
          required={true}
          error={error}
        />
        {showPasswordIndicator && passwordState && (
          <PasswordStrengthIndicator className="pt-1" strength={passwordState.tag} label={passwordState.label} />
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
            <a href="https://help.internxt.com/en/articles/8450457-how-do-i-create-a-backup-key" target="_blank">
              {translate('auth.signup.info.cta')}
            </a>
          </span>
        </p>
      </div>
    </>
  );
};

export default PasswordFieldWithInfo;
