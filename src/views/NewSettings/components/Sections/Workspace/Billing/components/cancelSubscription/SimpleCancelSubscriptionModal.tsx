import { Button, Modal } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import PlanDowngradeInfo from './PlanDowngradeInfo';

interface SimpleCancelSubscriptionModalProps {
  isOpen: boolean;
  description: string;
  isCancellingSubscription: boolean;
  cancelSubscription: () => void;
  onClose: () => void;
  showStorageInfo?: boolean;
  currentUsage?: number;
  currentPlanName?: string;
  currentPlanInfo?: string;
}

const SimpleCancelSubscriptionModal = ({
  isOpen,
  description,
  isCancellingSubscription,
  cancelSubscription,
  onClose,
  showStorageInfo = false,
  currentUsage = 0,
  currentPlanName = '',
  currentPlanInfo = '',
}: SimpleCancelSubscriptionModalProps): JSX.Element => {
  const { translate } = useTranslationContext();

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="mt-4 text-lg text-gray-100">{description}</p>

        {showStorageInfo && (
          <PlanDowngradeInfo
            currentPlanName={currentPlanName}
            currentPlanInfo={currentPlanInfo}
            currentUsage={currentUsage}
          />
        )}

        <div className="mt-1 flex justify-end">
          <Button
            className={'shadow-subtle-hard'}
            variant="secondary"
            disabled={isCancellingSubscription}
            onClick={cancelSubscription}
          >
            {translate('views.account.tabs.billing.cancelSubscriptionModal.cancelSubscription')}
          </Button>
          <Button className="ml-2 shadow-subtle-hard" disabled={isCancellingSubscription} onClick={onClose}>
            {translate('views.account.tabs.billing.cancelSubscriptionModal.keepSubscription')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SimpleCancelSubscriptionModal;
