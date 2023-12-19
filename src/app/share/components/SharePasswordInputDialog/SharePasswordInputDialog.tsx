import Button from 'app/shared/components/Button/Button';
import Modal from 'app/shared/components/Modal';
import { useState } from 'react';
import { Spinner } from '@phosphor-icons/react';
import Input from 'app/shared/components/Input';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

type SharePasswordInputDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSavePassword: (password: string) => Promise<void> | void;
  isAlreadyProtected?: boolean;
};

const MAX_PASSWORD_LENGTH = 50;

export const SharePasswordInputDialog = ({
  isOpen,
  onClose,
  onSavePassword,
  isAlreadyProtected = true,
}: SharePasswordInputDialogProps) => {
  const { translate } = useTranslationContext();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [password, setPassword] = useState('');

  const handleConfirm = async () => {
    setIsLoading(true);
    await onSavePassword(password);
    setIsLoading(false);
  };

  return (
    <Modal maxWidth="max-w-sm" className="space-y-5 p-5" isOpen={isOpen} onClose={onClose}>
      <p className="text-2xl font-medium">
        {!isAlreadyProtected
          ? translate('modals.shareModal.protectSharingModal.protect')
          : translate('modals.shareModal.protectSharingModal.editPasswordTitle')}
      </p>
      <Input
        onChange={(value) => {
          if (value.length <= MAX_PASSWORD_LENGTH) {
            setPassword(value);
          }
        }}
        value={password}
        variant="password"
        autoComplete="off"
      />
      <div className="flex items-center justify-end space-x-2">
        <Button variant="secondary" onClick={onClose}>
          {translate('modals.shareModal.protectSharingModal.buttons.cancel')}
        </Button>
        <Button variant="primary" onClick={handleConfirm} loading={isLoading} disabled={!password}>
          {isLoading && <Spinner className="h-4 w-4" />}
          {translate('modals.shareModal.protectSharingModal.buttons.save')}
        </Button>
      </div>
    </Modal>
  );
};
