import { useEffect, useState } from 'react';
import { deactivate2FA, userHas2FAStored } from 'app/auth/services/auth.service';
import { Button } from '@internxt/ui';
import Modal from 'app/shared/components/Modal';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import Input from 'app/shared/components/Input';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import errorService from 'app/core/services/error.service';

const TwoFactorAuthenticationDisableModal = ({
  isOpen,
  onClose,
  onDisabled,
  password,
}: {
  isOpen: boolean;
  onClose: () => void;
  onDisabled: () => void;
  password: string;
}): JSX.Element => {
  const { translate } = useTranslationContext();
  useEffect(() => {
    if (isOpen) {
      setStatus('ready');
      setAuthCode('');
    }
  }, [isOpen]);

  const [status, setStatus] = useState<'ready' | 'error' | 'loading'>('ready');
  const [authCode, setAuthCode] = useState('');

  async function handleDisable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('loading');
    try {
      const { encryptedSalt } = await userHas2FAStored();

      await deactivate2FA(encryptedSalt, password, authCode);

      notificationsService.show({ text: translate('success.twoFactorAuthDisabled'), type: ToastType.Success });
      onDisabled();
      onClose();
    } catch (err) {
      setStatus('error');
      const castedError = errorService.castError(err);
      notificationsService.show({ text: castedError.message || translate('error.serverError'), type: ToastType.Error });
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleDisable}>
        <h1 className="text-2xl font-medium text-gray-80">
          {translate('views.account.tabs.security.2FA.titleDisable')}
        </h1>
        <Input
          className="mt-4"
          label={translate('views.account.tabs.security.2FA.modal.2FALabelCode') as string}
          disabled={status === 'loading'}
          accent={status === 'error' ? 'error' : undefined}
          message={
            status === 'error'
              ? (translate('views.account.tabs.security.2FA.modal.errors.incorrect') as string)
              : undefined
          }
          value={authCode}
          onChange={setAuthCode}
        />
        <div className="mt-4 flex justify-end">
          <Button onClick={onClose} variant="secondary" disabled={status === 'loading'}>
            {translate('actions.cancel')}
          </Button>
          <Button className="ml-2" type="submit" loading={status === 'loading'} disabled={authCode.length < 6}>
            {translate('actions.disable')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TwoFactorAuthenticationDisableModal;
