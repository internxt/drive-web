import testPasswordStrength from '@internxt/lib/dist/src/auth/testPasswordStrength';
import { t } from 'i18next';
import { MAX_PASSWORD_LENGTH } from '../shared/components/ValidPassword';

const onChangePasswordHandler = ({
  password,
  setIsValidPassword,
  setPasswordState,
  email,
}: {
  password: string;
  setIsValidPassword: (value: boolean) => void;
  setPasswordState: ({ tag, label }: { tag: 'error' | 'warning' | 'success'; label: string }) => void;
  email?: string | string[] | null;
}) => {
  setIsValidPassword(false);
  if (password.length > MAX_PASSWORD_LENGTH) {
    setPasswordState({ tag: 'error', label: t('modals.changePasswordModal.errors.longPassword') });
    return;
  }

  const result = testPasswordStrength(password, (email as string) === undefined ? '' : (email as string));

  setIsValidPassword(result.valid);
  if (!result.valid) {
    setPasswordState({
      tag: 'error',
      label:
        result.reason === 'NOT_COMPLEX_ENOUGH'
          ? 'Password is not complex enough'
          : 'Password has to be at least 8 characters long',
    });
  } else if (result.strength === 'medium') {
    setPasswordState({ tag: 'warning', label: 'Password is weak' });
  } else {
    setPasswordState({ tag: 'success', label: 'Password is strong' });
  }
};

export { onChangePasswordHandler };
