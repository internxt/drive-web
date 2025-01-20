import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';
import { Button, Loader } from '@internxt/ui';
import Modal from '../../../shared/components/Modal';

const StopSharingItemDialog = ({
  showStopSharingConfirmation,
  onClose,
  itemToShareName,
  isLoading,
  onStopSharing,
}: {
  showStopSharingConfirmation: boolean;
  onClose: () => void;
  itemToShareName: string;
  isLoading: boolean;
  onStopSharing: (item) => void;
}) => {
  const { translate } = useTranslationContext();
  return (
    <Modal
      maxWidth="max-w-sm"
      className="space-y-5 p-5"
      isOpen={showStopSharingConfirmation}
      onClose={onClose}
      preventClosing={isLoading}
    >
      <p className="text-2xl font-medium">{translate('modals.shareModal.stopSharing.title')}</p>
      <p className="text-lg text-gray-80">
        {translate('modals.shareModal.stopSharing.subtitle', { name: itemToShareName })}
      </p>
      <div className="flex items-center justify-end space-x-2">
        <Button variant="secondary" onClick={() => onClose()} disabled={isLoading}>
          {translate('modals.shareModal.stopSharing.cancel')}
        </Button>
        <Button variant="destructive" onClick={onStopSharing} disabled={isLoading}>
          {isLoading && <Loader classNameLoader="h-4 w-4" />}
          <span>{translate('modals.shareModal.stopSharing.confirm')}</span>
        </Button>
      </div>
    </Modal>
  );
};

export default StopSharingItemDialog;
