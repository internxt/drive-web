import { useTranslationContext } from '../../../../../i18n/provider/TranslationProvider';
import { Button, Loader } from '@internxt/ui';
import Modal from '../../../../../shared/components/Modal';

const StopSharingAndMoveToTrashDialog = ({
  showStopSharingConfirmation,
  onClose,
  itemToShareName,
  isLoading,
  onStopSharing,
  isMultipleItems,
}: {
  showStopSharingConfirmation: boolean;
  onClose: () => void;
  itemToShareName: string;
  isLoading: boolean;
  onStopSharing: (item) => void;
  isMultipleItems?: boolean;
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
      <p className="text-2xl font-medium">{translate('modals.shareModal.stopSharingAndMoveToTrash.title')}</p>
      <p className="text-lg text-gray-80">
        {isMultipleItems
          ? translate('modals.shareModal.stopSharingAndMoveToTrash.multipleItemsSubtitle')
          : translate('modals.shareModal.stopSharingAndMoveToTrash.subtitle', { name: itemToShareName })}
      </p>
      <div className="flex items-center justify-end space-x-2">
        <Button variant="secondary" onClick={() => onClose()} disabled={isLoading}>
          {translate('modals.shareModal.stopSharingAndMoveToTrash.cancel')}
        </Button>
        <Button variant="destructive" onClick={onStopSharing} disabled={isLoading}>
          {isLoading && <Loader classNameLoader="h-4 w-4" />}
          <span>{translate('modals.shareModal.stopSharingAndMoveToTrash.confirm')}</span>
        </Button>
      </div>
    </Modal>
  );
};

export default StopSharingAndMoveToTrashDialog;
