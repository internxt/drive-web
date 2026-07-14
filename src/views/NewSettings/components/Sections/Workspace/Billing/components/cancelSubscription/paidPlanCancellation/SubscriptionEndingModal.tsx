import { Button, Modal } from '@internxt/ui';
import { FreeStoragePlan } from 'app/drive/types';
import { bytesToString } from 'app/drive/services/size.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { dateService } from 'services';

interface SubscriptionEndingModalProps {
  isOpen: boolean;
  currentPlanName: string;
  currentPlanInfo: string;
  currentUsage: number;
  currentPlanLimit: number;
  cancellationDate: string;
  onClose: () => void;
  onRenewSubscription: () => void;
}

const SubscriptionEndingModal = ({
  isOpen,
  currentPlanName,
  currentPlanInfo,
  currentUsage,
  currentPlanLimit,
  cancellationDate,
  onClose,
  onRenewSubscription,
}: SubscriptionEndingModalProps): JSX.Element => {
  const { translate } = useTranslationContext();

  const isOverFreeLimit = currentUsage > FreeStoragePlan.storageLimit;
  const usagePercentage = Math.min((currentUsage / FreeStoragePlan.storageLimit) * 100, 100);
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

        <div className="flex flex-row items-center justify-center gap-3">
          <div className="flex w-40 flex-col items-center justify-center rounded-xl border border-gray-10 p-3">
            <div className="rounded-xl border border-gray-10 bg-gray-1">
              <p className="py-0.5 px-1.5 text-xs font-medium">
                {translate('views.account.tabs.billing.cancelSubscriptionModal.infoBox.titleCurrent')}
              </p>
            </div>
            <div className="mt-3">
              <span className="text-xl font-bold text-primary">{currentPlanName}</span>
            </div>
            <div>
              <span className="text-sm font-medium">{currentPlanInfo}</span>
            </div>
          </div>
          <span className="text-gray-40">&rarr;</span>
          <div className="flex w-40 flex-col items-center justify-center rounded-xl border border-gray-10 p-3">
            <div className="rounded-xl border border-gray-10 bg-gray-1">
              <p className="py-0.5 px-1.5 text-xs font-medium">
                {translate('views.account.tabs.billing.cancelSubscriptionModal.infoBox.titleNew')}
              </p>
            </div>
            <div className="mt-3">
              <span className="text-xl font-bold text-red">{FreeStoragePlan.simpleName}</span>
            </div>
            <div>
              <span className="text-sm font-medium">
                {translate('views.account.tabs.billing.cancelSubscriptionModal.infoBox.free')}
              </span>
            </div>
          </div>
        </div>

        {isOverFreeLimit && (
          <div className="rounded-xl border border-red/20 bg-red/5 p-4 text-center">
            <p className="text-sm font-medium text-gray-100">{FreeStoragePlan.simpleName}</p>
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-5">
              <div className="h-full rounded-full bg-red" style={{ width: `${usagePercentage}%` }} />
            </div>
            <p className="mt-3 font-semibold text-red">
              {translate(
                'views.account.tabs.billing.cancelSubscriptionModal.options.endNow.confirmationModal.overStorage.title',
                { freeLimit: FreeStoragePlan.simpleName },
              )}
            </p>
            <p className="mt-1 text-sm text-red">
              {translate(
                'views.account.tabs.billing.cancelSubscriptionModal.options.endNow.confirmationModal.overStorage.description',
                { currentUsage: bytesToString(currentPlanLimit) },
              )}
            </p>
          </div>
        )}

        <div className="flex flex-row items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {translate('views.account.tabs.billing.subscriptionEndingModal.maybeLater')}
          </Button>
          <Button variant="primary" onClick={onRenewSubscription}>
            {translate('views.account.tabs.billing.subscriptionEndingModal.renewSubscription')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SubscriptionEndingModal;
