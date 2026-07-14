import { FreeStoragePlan } from 'app/drive/types';
import { bytesToString } from 'app/drive/services/size.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

interface PlanDowngradeInfoProps {
  currentPlanName: string;
  currentPlanInfo: string;
  currentUsage: number;
}

const PlanDowngradeInfo = ({ currentPlanName, currentPlanInfo, currentUsage }: PlanDowngradeInfoProps): JSX.Element => {
  const { translate } = useTranslationContext();

  const isOverFreeLimit = currentUsage > FreeStoragePlan.storageLimit;
  const usagePercentage = Math.min((currentUsage / FreeStoragePlan.storageLimit) * 100, 100);

  return (
    <div className="flex flex-col gap-4 w-full">
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
          <p className="mt-3 font-semibold text-red">
            {translate(
              'views.account.tabs.billing.cancelSubscriptionModal.options.endNow.confirmationModal.overStorage.title',
              { freeLimit: FreeStoragePlan.simpleName },
            )}
          </p>
          <p className="mt-1 text-sm text-red">
            {translate(
              'views.account.tabs.billing.cancelSubscriptionModal.options.endNow.confirmationModal.overStorage.description',
              { currentUsage: bytesToString(currentUsage) },
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default PlanDowngradeInfo;
