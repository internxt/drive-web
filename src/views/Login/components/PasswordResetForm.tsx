import { useState, useEffect } from 'react';
import { Button, Input } from '@internxt/ui';
import { WarningCircle } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import PasswordStrengthIndicator from 'app/shared/components/PasswordStrengthIndicator';
import testPasswordStrength from '@internxt/lib/dist/src/auth/testPasswordStrength';
import { MAX_PASSWORD_LENGTH } from 'app/shared/components/ValidPassword';

interface PasswordResetFormProps {
  onSubmit: (password: string) => Promise<void>;
  isLoading: boolean;
  submitButtonText: string;
  submitButtonVariant?: 'primary' | 'destructive';
}

export default function PasswordResetForm({
  onSubmit,
  isLoading,
  submitButtonText,
  submitButtonVariant = 'primary',
}: Readonly<PasswordResetFormProps>): JSX.Element {
  const { translate } = useTranslationContext();
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [showPasswordIndicator, setShowPasswordIndicator] = useState(false);
  const [isValidPassword, setIsValidPassword] = useState(false);
  const [isEqualPassword, setIsEqualPassword] = useState(false);
  const [passwordState, setPasswordState] = useState<{
    tag: 'error' | 'warning' | 'success';
    label: string;
  } | null>(null);

  useEffect(() => {
    if (newPassword.length > 0) validatePassword(newPassword);
    confirmNewPassword && confirmNewPassword !== newPassword ? setIsEqualPassword(false) : setIsEqualPassword(true);
  }, [newPassword]);

  useEffect(() => {
    const confirmNewPasswordLength = confirmNewPassword.length;
    const firstLettersPassword = newPassword.substring(0, confirmNewPasswordLength);
    confirmNewPassword && confirmNewPassword !== firstLettersPassword
      ? setIsEqualPassword(false)
      : setIsEqualPassword(true);
  }, [confirmNewPassword]);

  const validatePassword = (input: string) => {
    setIsValidPassword(false);
    if (input.length > MAX_PASSWORD_LENGTH) {
      setPasswordState({ tag: 'error', label: translate('modals.changePasswordModal.errors.longPassword') });
      return;
    }

    const result = testPasswordStrength(input, '');
    setIsValidPassword(result.valid);

    if (!result.valid) {
      setPasswordState({
        tag: 'error',
        label:
          result.reason === 'NOT_COMPLEX_ENOUGH'
            ? translate('auth.recoverAccount.changePassword.notPasswordStrength')
            : translate('auth.recoverAccount.changePassword.shortPasswordStrength'),
      });
    } else if (result.strength === 'medium') {
      setPasswordState({
        tag: 'warning',
        label: translate('auth.recoverAccount.changePassword.warningPasswordStrength'),
      });
    } else {
      setPasswordState({
        tag: 'success',
        label: translate('auth.recoverAccount.changePassword.successPasswordStrength'),
      });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(newPassword);
  };

  return (
    <form className="flex w-full flex-col space-y-6" onSubmit={handleSubmit}>
      <div className="flex flex-col space-y-3">
        <Input
          label={translate('auth.recoverAccount.changePassword.newPassword')}
          value={newPassword}
          variant="password"
          onFocus={() => setShowPasswordIndicator(true)}
          onChange={setNewPassword}
          required={true}
        />
        {showPasswordIndicator && passwordState && (
          <PasswordStrengthIndicator className="pt-1" strength={passwordState.tag} label={passwordState.label} />
        )}
        <Input
          disabled={!isValidPassword && !confirmNewPassword}
          label={translate('auth.recoverAccount.changePassword.repeatNewPassword')}
          value={confirmNewPassword}
          variant="password"
          onChange={setConfirmNewPassword}
          required={true}
        />
        {confirmNewPassword && !isEqualPassword && (
          <div className="flex flex-row items-start pt-1">
            <div className="flex h-5 flex-row items-center">
              <WarningCircle weight="fill" className="mr-1 h-4 text-red" />
            </div>
            <span className="font-base w-56 text-sm text-red">
              {translate('auth.recoverAccount.changePassword.notMatch')}
            </span>
          </div>
        )}
        <Button
          disabled={!(newPassword === confirmNewPassword && isValidPassword)}
          loading={isLoading}
          variant={submitButtonVariant}
          className="w-full"
          type="submit"
        >
          {submitButtonText}
        </Button>
      </div>
    </form>
  );
}
