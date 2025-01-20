import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useEffect, useState } from 'react';

import { changePassword } from 'app/auth/services/auth.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';

import { Button } from '@internxt/ui';
import Input from 'app/shared/components/Input';
import Modal from 'app/shared/components/Modal';
import ValidPassword from 'app/shared/components/ValidPassword';

const ChangePasswordModal = ({
  isOpen,
  onClose,
  currentPassword,
  onPasswordChanged,
  user,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentPassword: string;
  onPasswordChanged: (newPassword: string) => void;
  user: UserSettings | undefined;
}) => {
  const { translate } = useTranslationContext();
  if (!user) throw new Error('User is not defined');
  const { email } = user;

  const DEFAULT_PASSWORD_PAYLOAD = { valid: false, password: '' };
  const [passwordPayload, setPasswordPayload] = useState(DEFAULT_PASSWORD_PAYLOAD);
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isConfirmationWrong = passwordPayload.password.slice(0, passwordConfirmation.length) !== passwordConfirmation;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    await changePassword(passwordPayload.password, currentPassword, email);
    notificationsService.show({ text: translate('success.passwordChanged'), type: ToastType.Success });
    onPasswordChanged(passwordPayload.password);
    onClose();
    setIsLoading(false);
  }

  useEffect(() => {
    if (isOpen) {
      setPasswordPayload(DEFAULT_PASSWORD_PAYLOAD);
      setPasswordConfirmation('');
      setIsLoading(false);
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <h1 className="text-2xl font-medium text-gray-80">{translate('modals.changePasswordModal.title')}</h1>
        <ValidPassword
          username={email}
          className="mt-4"
          label={translate('modals.changePasswordModal.newPassword')}
          value={passwordPayload.password}
          onChange={setPasswordPayload}
          disabled={isLoading}
          dataTest="new-password"
        />
        <Input
          value={passwordConfirmation}
          onChange={setPasswordConfirmation}
          variant="password"
          className="mt-3"
          label={translate('modals.changePasswordModal.confirmPassword')}
          accent={isConfirmationWrong ? 'error' : undefined}
          message={isConfirmationWrong ? translate('modals.changePasswordModal.errors.doesntMatch') : undefined}
          disabled={isLoading}
          dataTest="new-password-confirmation"
        />
        <div className="mt-3 flex justify-end">
          <Button variant="secondary" disabled={isLoading} onClick={onClose}>
            {translate('actions.cancel')}
          </Button>
          <Button
            loading={isLoading}
            type="submit"
            disabled={!passwordPayload.valid || passwordConfirmation !== passwordPayload.password}
            className="ml-2"
            dataTest="next-button"
          >
            {translate('modals.changePasswordModal.title')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ChangePasswordModal;
