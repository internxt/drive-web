import { Button, Modal } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { dateService } from 'services';
import PlanDowngradeInfo from '../PlanDowngradeInfo';

interface SubscriptionEndingModalProps {
  isOpen: boolean;
  currentPlanName: string;
  currentPlanInfo: string;
  currentUsage: number;
  cancellationDate: string;
  isReactivatingSubscription: boolean;
  onClose: () => void;
  onReactivateSubscription: () => void;
}

const SubscriptionEndingModal = ({
  isOpen,
  currentPlanName,
  currentPlanInfo,
  currentUsage,
  cancellationDate,
  isReactivatingSubscription,
  onClose,
  onReactivateSubscription,
}: SubscriptionEndingModalProps): JSX.Element => {
  const { translate } = useTranslationContext();

  const formattedCancellationDate = dateService.format(cancellationDate, 'DD MMM YYYY');

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <h4 className="text-2xl font-medium text-gray-100">
          {translate('views.account.tabs.billing.subscriptionEndingModal.title', {
            endDate: formattedCancellationDate,
          })}
        </h4>

        <div className="text-gray-100">
          <p>{translate('views.account.tabs.billing.subscriptionEndingModal.description.title')}</p>
          <ul className="mt-2 list-disc pl-5">
            <li>{translate('views.account.tabs.billing.subscriptionEndingModal.description.storageReturns')}</li>
            <li>{translate('views.account.tabs.billing.subscriptionEndingModal.description.featuresUnavailable')}</li>
          </ul>
        </div>

        <PlanDowngradeInfo
          currentPlanName={currentPlanName}
          currentPlanInfo={currentPlanInfo}
          currentUsage={currentUsage}
        />

        <div className="flex flex-row items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isReactivatingSubscription}>
            {translate('views.account.tabs.billing.subscriptionEndingModal.maybeLater')}
          </Button>
          <Button
            variant="primary"
            onClick={onReactivateSubscription}
            disabled={isReactivatingSubscription}
            loading={isReactivatingSubscription}
          >
            {translate('views.account.tabs.billing.subscriptionEndingModal.renewSubscription')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SubscriptionEndingModal;
