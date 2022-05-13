import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { changePassword } from '../../../../../auth/services/auth.service';
import i18n from '../../../../../i18n/services/i18n.service';
import notificationsService, { ToastType } from '../../../../../notifications/services/notifications.service';
import Button from '../../../../../shared/components/Button/Button';
import Card from '../../../../../shared/components/Card';
import Input from '../../../../../shared/components/Input';
import Modal from '../../../../../shared/components/Modal';
import ValidPassword from '../../../../../shared/components/ValidPassword';
import { RootState } from '../../../../../store';
import errorService from '../../../../services/error.service';
import Section from '../../components/Section';

export default function ChangePassword({
  className = '',
  currentPassword,
  onPasswordChanged,
}: {
  className?: string;
  currentPassword: string;
  onPasswordChanged: (newPassword: string) => void;
}): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <Section className={className} title="Change password">
      <Card>
        <p className="text-gray-60">
          Remember that if you forget the password, you will lose access to all your files. We recommend using a
          password manager.
        </p>
        <Button className="mt-3" onClick={() => setIsModalOpen(true)}>
          Change password
        </Button>
      </Card>
      <ChangePasswordModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentPassword={currentPassword}
        onPasswordChanged={onPasswordChanged}
      />
    </Section>
  );
}

function ChangePasswordModal({
  isOpen,
  onClose,
  currentPassword,
  onPasswordChanged,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentPassword: string;
  onPasswordChanged: (newPassword: string) => void;
}) {
  const user = useSelector<RootState, UserSettings | undefined>((state) => state.user.user);
  if (!user) throw new Error('User is not defined');
  const { email } = user;

  const DEFAULT_PASSWORD_PAYLOAD = { valid: false, password: '' };
  const [passwordPayload, setPasswordPayload] = useState(DEFAULT_PASSWORD_PAYLOAD);

  const [passwordConfirmation, setPasswordConfirmation] = useState('');

  const isConfirmationWrong = passwordPayload.password.slice(0, passwordConfirmation.length) !== passwordConfirmation;

  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    setIsLoading(true);
    try {
      await changePassword(passwordPayload.password, currentPassword, email);
      notificationsService.show({ text: i18n.get('success.passwordChanged'), type: ToastType.Success });
      onPasswordChanged(passwordPayload.password);
      onClose();
    } catch (err) {
      const error = errorService.castError(err);
      notificationsService.show({ text: error.message, type: ToastType.Error });
    }
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
      <h1 className="text-2xl font-medium text-gray-80">Change password</h1>
      <ValidPassword
        username={email}
        className="mt-4"
        label="New password"
        value={passwordPayload.password}
        onChange={setPasswordPayload}
        disabled={isLoading}
      />
      <Input
        value={passwordConfirmation}
        onChange={setPasswordConfirmation}
        variant="password"
        className="mt-3"
        label="Confirm new password"
        accent={isConfirmationWrong ? 'error' : undefined}
        message={isConfirmationWrong ? 'Password confirmation does not match the password' : undefined}
        disabled={isLoading}
      />
      <div className="mt-3 flex justify-end">
        <Button variant="secondary" disabled={isLoading} onClick={onClose}>
          Cancel
        </Button>
        <Button
          loading={isLoading}
          onClick={handleSubmit}
          disabled={!passwordPayload.valid || passwordConfirmation !== passwordPayload.password}
          className="ml-2"
        >
          Next
        </Button>
      </div>
    </Modal>
  );
}
