import { useEffect, useState } from 'react';
import { useTranslationContext } from '../../../../../i18n/provider/TranslationProvider';
import { Button } from '@internxt/ui';
import Input from '../../../../../shared/components/Input';
import Modal from '../../../../../shared/components/Modal';

interface ChangeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  checkEmailCredentials: (password: string) => Promise<boolean>;
  changeEmail: (newEmail: string) => Promise<void>;
  onChangeEmailError: (error: unknown) => void;
}

const ChangeEmailModal = ({
  isOpen,
  onClose,
  email,
  checkEmailCredentials,
  changeEmail,
  onChangeEmailError,
}: ChangeEmailModalProps) => {
  const { translate } = useTranslationContext();
  const [password, setPassword] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');

  const [status, setStatus] = useState<
    | { tag: 'ready' }
    | { tag: 'loading' }
    | { tag: 'error'; type: 'NAME_INVALID' | 'LASTNAME_INVALID' | 'PASSWORD_INVALID' | 'SAME_EMAIL' | 'UNKNOWN' }
  >({ tag: 'ready' });

  const isInvalidPasswordError = status.tag === 'error' && status.type === 'PASSWORD_INVALID';
  const isLoadingStatus = status.tag === 'loading';

  useEffect(() => {
    if (isOpen) {
      setStatus({ tag: 'ready' });
    }
  }, [isOpen]);

  async function onChange(e) {
    e.preventDefault();
    if (email === newEmail) {
      setStatus({ tag: 'error', type: 'SAME_EMAIL' });
    } else {
      try {
        setStatus({ tag: 'loading' });
        const correctPassword = await checkEmailCredentials(password);
        if (correctPassword) {
          await changeEmail(newEmail);
          onClose();
        } else {
          setStatus({ tag: 'error', type: 'PASSWORD_INVALID' });
        }
      } catch (error) {
        setStatus({ tag: 'error', type: 'UNKNOWN' });
        onChangeEmailError(error);
      }
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form className="flex flex-col space-y-5" onSubmit={onChange}>
        <h1 className="text-2xl font-medium text-gray-80">
          {translate('views.account.tabs.account.accountDetails.changeEmail.title')}
        </h1>

        <div className="flex flex-col space-y-3">
          <Input
            disabled
            label={translate('views.account.tabs.account.accountDetails.changeEmail.email')}
            value={email}
            name="email"
          />
          <Input
            required
            variant="email"
            autoComplete="off"
            label={translate('views.account.tabs.account.accountDetails.changeEmail.newEmail')}
            onChange={setNewEmail}
            accent={status.tag === 'error' && status.type === 'SAME_EMAIL' ? 'error' : undefined}
            message={
              status.tag === 'error' && status.type === 'SAME_EMAIL'
                ? translate('views.account.tabs.account.accountDetails.changeEmail.errorSameEmail')
                : undefined
            }
            name="newemail"
          />
          <Input
            required
            disabled={isLoadingStatus}
            label={translate('views.account.tabs.account.accountDetails.changeEmail.password')}
            variant="password"
            onChange={setPassword}
            accent={isInvalidPasswordError ? 'error' : undefined}
            message={
              isInvalidPasswordError
                ? translate('views.account.tabs.account.accountDetails.changeEmail.errorPassword')
                : undefined
            }
            name="password"
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button disabled={isLoadingStatus} variant="secondary" onClick={onClose}>
            {translate('actions.cancel')}
          </Button>
          <Button loading={isLoadingStatus} type="submit">
            {isLoadingStatus
              ? translate('views.account.tabs.account.accountDetails.changeEmail.sendingVerification')
              : translate('views.account.tabs.account.accountDetails.changeEmail.sendVerification')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ChangeEmailModal;
