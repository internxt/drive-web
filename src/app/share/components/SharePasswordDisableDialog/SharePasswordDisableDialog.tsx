import Button from 'app/shared/components/Button/Button';
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
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    await onConfirmHandler();
    setIsLoading(false);
  };

  return (
    <Modal maxWidth="max-w-md" isOpen={isOpen} onClose={onClose} preventClosing={isLoading}>
      <div className="flex flex-col space-y-5">
        <p className="text-2xl font-medium text-gray-100">Disable password protection?</p>
        <p className="text-lg text-gray-80">When disabled, people with the link will be able to access the content.</p>

        <div className="flex flex-row items-center justify-end space-x-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={isLoading} onClick={handleConfirm}>
            Disable
          </Button>
        </div>
      </div>
    </Modal>
  );
};
