import { t } from 'i18next';
import { Button } from '@internxt/ui';
import CancelSubscriptionModal from '../../../Workspace/Billing/CancelSubscriptionModal';
import { StoragePlan, UserType } from '@internxt/sdk/dist/drive/payments/types/types';

interface CancelSubscriptionProps {
  individualPlan: StoragePlan | null;
  isCancelSubscriptionModalOpen: boolean;
  cancellingSubscription: boolean;
  applyingTrial: boolean;
  planName: string;
  planInfo: string;
  currentUsage: number;
  userType?: UserType;
  activateTrial: () => void;
  cancelSubscription: () => void;
  setIsCancelSubscriptionModalOpen: (isCancelSubscriptionModalOpen: boolean) => void;
}

const CancelSubscription = ({
  individualPlan,
  isCancelSubscriptionModalOpen,
  cancellingSubscription,
  applyingTrial,
  planName,
  planInfo,
  currentUsage,
  userType = UserType.Individual,
  activateTrial,
  cancelSubscription,
  setIsCancelSubscriptionModalOpen,
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

      <CancelSubscriptionModal
        individualPlan={individualPlan}
        isOpen={isCancelSubscriptionModalOpen}
        onClose={() => {
          setIsCancelSubscriptionModalOpen(false);
        }}
        cancellingSubscription={cancellingSubscription}
        applyingTrial={applyingTrial}
        currentPlanName={planName}
        currentPlanInfo={planInfo}
        currentUsage={currentUsage}
        userType={userType}
        cancelSubscription={cancelSubscription}
        activateTrial={activateTrial}
      />
    </section>
  );
};

export default CancelSubscription;
