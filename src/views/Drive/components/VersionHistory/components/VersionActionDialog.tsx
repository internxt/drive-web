import { useState } from 'react';
import { Button, Modal } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import errorService from 'services/error.service';

type VersionActionType = 'delete' | 'restore';

interface VersionActionDialogProps {
  isOpen: boolean;
  actionType: VersionActionType;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const VersionActionDialog = ({ isOpen, actionType, onClose, onConfirm }: VersionActionDialogProps) => {
  const { translate } = useTranslationContext();
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    if (isLoading) return;
    onClose();
  };

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      await onConfirm();
      setIsLoading(false);
      onClose();
    } catch (error) {
      setIsLoading(false);
      const castedError = errorService.castError(error);
      errorService.reportError(castedError);
    }
  };

  const config = {
    delete: {
      titleKey: 'deleteVersionTitle',
      adviceKey: 'deleteVersionAdvice',
      buttonKey: 'deleteButton',
      buttonVariant: 'destructive' as const,
      buttonClassName: '[&:not(:disabled)]:!bg-[#E50B00] [&:not(:disabled)]:hover:!bg-[#C00A00]',
    },
    restore: {
      titleKey: 'restoreVersionTitle',
      adviceKey: 'restoreVersionAdvice',
      buttonKey: 'restoreButton',
      buttonVariant: 'primary' as const,
      buttonClassName: '',
    },
  }[actionType];

  return (
    <Modal maxWidth="max-w-md" isOpen={isOpen} onClose={handleClose}>
      <div className="flex flex-col space-y-5">
        <p className="text-2xl font-medium text-gray-100">{translate(`modals.versionHistory.${config.titleKey}`)}</p>
        <p className="text-lg text-gray-80 whitespace-pre-line">
          {translate(`modals.versionHistory.${config.adviceKey}`)}
        </p>

        <div className="flex flex-row items-center justify-end space-x-2">
          <Button
            disabled={isLoading}
            variant="secondary"
            onClick={handleClose}
            className="!bg-transparent !text-primary border-2 border-primary hover:!bg-primary/10 hover:!border-primary"
          >
            {translate('actions.cancel')}
          </Button>
          <Button
            loading={isLoading}
            variant={config.buttonVariant}
            onClick={handleConfirm}
            className={config.buttonClassName}
          >
            {translate(`modals.versionHistory.${config.buttonKey}`)}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
