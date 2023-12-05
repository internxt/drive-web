import { useTranslationContext } from '../../i18n/provider/TranslationProvider';
import Button from '../../shared/components/Button/Button';
import Modal from '../../shared/components/Modal';
import Spinner from '../../shared/components/Spinner/Spinner';

const StopSharingItem = ({
  showStopSharingConfirmation,
  setShowStopSharingConfirmation,
  name,
  isLoading,
  onStopSharing,
}: {
  showStopSharingConfirmation: boolean;
  setShowStopSharingConfirmation: (show: boolean) => void;
  name: string;
  isLoading: boolean;
  onStopSharing: () => void;
}) => {
  const { translate } = useTranslationContext();
  return (
    <Modal
      maxWidth="max-w-sm"
      className="space-y-5 p-5"
      isOpen={showStopSharingConfirmation}
      onClose={() => setShowStopSharingConfirmation(false)}
      preventClosing={showStopSharingConfirmation && isLoading}
    >
      <p className="text-2xl font-medium">{translate('modals.shareModal.stopSharing.title')}</p>
      <p className="text-lg text-gray-80">{translate('modals.shareModal.stopSharing.subtitle', { name: name })}</p>
      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="secondary"
          onClick={() => setShowStopSharingConfirmation(false)}
          disabled={showStopSharingConfirmation && isLoading}
        >
          {translate('modals.shareModal.stopSharing.cancel')}
        </Button>
        <Button variant="accent" onClick={onStopSharing} disabled={showStopSharingConfirmation && isLoading}>
          {isLoading && <Spinner className="h-4 w-4" />}
          <span>{translate('modals.shareModal.stopSharing.confirm')}</span>
        </Button>
      </div>
    </Modal>
  );
};

export default StopSharingItem;
