import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { Button } from '@internxt/ui';
import Modal from 'app/shared/components/Modal';
import { useState } from 'react';

type SharePasswordDisableWarningDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirmHandler: () => Promise<void> | void;
};

export const SharePasswordDisableDialog = ({
  isOpen,
  onClose,
  onConfirmHandler,
}: SharePasswordDisableWarningDialogProps) => {
  const { translate } = useTranslationContext();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    await onConfirmHandler();
    setIsLoading(false);
  };

  return (
    <Modal maxWidth="max-w-md" isOpen={isOpen} onClose={onClose} preventClosing={isLoading}>
      <div className="flex flex-col space-y-5">
        <p className="text-2xl font-medium text-gray-100">
          {translate('modals.shareModal.protectSharingModal.disablePasswordTitle')}
        </p>
        <p className="text-lg text-gray-80">{translate('modals.shareModal.protectSharingModal.disablePasswordBody')}</p>

        <div className="flex flex-row items-center justify-end space-x-2">
          <Button variant="secondary" onClick={onClose}>
            {translate('modals.shareModal.protectSharingModal.buttons.cancel')}
          </Button>
          <Button variant="primary" loading={isLoading} onClick={handleConfirm}>
            {translate('modals.shareModal.protectSharingModal.buttons.disable')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
