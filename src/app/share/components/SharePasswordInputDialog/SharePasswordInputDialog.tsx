import { Button, Modal, Input } from '@internxt/ui';
import { useState } from 'react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import validationService from 'services/validation.service';

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

  const handleConfirm = async (e?: unknown) => {
    const event = e as React.FormEvent<HTMLFormElement>;
    event.preventDefault();
    setIsLoading(true);
    await onSavePassword(password);
    setIsLoading(false);
  };

  return (
    <Modal maxWidth="max-w-sm" isOpen={isOpen} onClose={onClose}>
      <form
        onSubmit={handleConfirm}
        className="space-y-5 p-5"
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        <p className="text-2xl font-medium">
          {!isAlreadyProtected
            ? translate('modals.shareModal.protectSharingModal.protect')
            : translate('modals.shareModal.protectSharingModal.editPasswordTitle')}
        </p>
        <Input
          onChange={(value) => {
            if (value.length <= MAX_PASSWORD_LENGTH && validationService.validatePasswordInput(value)) {
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
            {translate('modals.shareModal.protectSharingModal.buttons.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
