import { t } from 'i18next';
import { Button } from '@internxt/ui';
import CancelSubscriptionDialog from '../../../Workspace/Billing/CancelSubscriptionDialog';
import { StoragePlan, UserType } from '@internxt/sdk/dist/drive/payments/types/types';

interface CancelSubscriptionProps {
  individualPlan: StoragePlan | null;
  isCancelSubscriptionModalOpen: boolean;
  isCancellingSubscription: boolean;
  isApplyingTrial?: boolean;
  nextBillingDate?: string;
  planName: string;
  planInfo: string;
  currentUsage: number;
  userType?: UserType;
  activateTrial?: () => void;
  cancelSubscription: () => void;
  setIsCancelSubscriptionModalOpen: (isCancelSubscriptionModalOpen: boolean) => void;
  earlyCancellationClientSecret?: string | null;
  earlyCancelSubscription?: () => void;
  onEarlyCancellationConfirmed?: () => void;
}

const CancelSubscriptionSection = ({
  individualPlan,
  isCancelSubscriptionModalOpen,
  isCancellingSubscription,
  isApplyingTrial,
  nextBillingDate,
  planName,
  planInfo,
  currentUsage,
  userType = UserType.Individual,
  activateTrial,
  cancelSubscription,
  setIsCancelSubscriptionModalOpen,
  earlyCancellationClientSecret,
  earlyCancelSubscription,
  onEarlyCancellationConfirmed,
}: CancelSubscriptionProps) => {
  const onCancelSubscriptionButtonClicked = () => {
    setIsCancelSubscriptionModalOpen(true);
  };

  return (
    <section className="mt-8 border-t border-gray-10 pt-8">
      <h3 className="mb-1 text-lg font-medium text-gray-100">
        {t('preferences.workspace.billing.cancelSubscription.title')}
      </h3>
      <p className="font-regular mb-3 text-sm text-gray-60">
        {t('preferences.workspace.billing.cancelSubscription.text')}
      </p>
      <Button variant="secondary" onClick={onCancelSubscriptionButtonClicked}>
        {t('preferences.workspace.billing.cancelSubscription.button')}
      </Button>

      <CancelSubscriptionDialog
        individualPlan={individualPlan}
        isOpen={isCancelSubscriptionModalOpen}
        onClose={() => {
          setIsCancelSubscriptionModalOpen(false);
        }}
        isCancellingSubscription={isCancellingSubscription}
        isApplyingTrial={isApplyingTrial}
        nextBillingDate={nextBillingDate}
        currentPlanName={planName}
        currentPlanInfo={planInfo}
        currentUsage={currentUsage}
        userType={userType}
        cancelSubscription={cancelSubscription}
        activateTrial={activateTrial}
        earlyCancellationClientSecret={earlyCancellationClientSecret}
        earlyCancelSubscription={earlyCancelSubscription}
        onEarlyCancellationConfirmed={onEarlyCancellationConfirmed}
      />
    </section>
  );
};

export default CancelSubscriptionSection;
