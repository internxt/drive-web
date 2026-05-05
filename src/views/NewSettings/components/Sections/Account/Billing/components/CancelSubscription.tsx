import { t } from 'i18next';
import { Button } from '@internxt/ui';
import CancelSubscriptionModal from '../../../Workspace/Billing/CancelSubscriptionModal';
import { StoragePlan, UserType } from '@internxt/sdk/dist/drive/payments/types/types';

interface CancelSubscriptionProps {
  individualPlan: StoragePlan | null;
  isCancelSubscriptionModalOpen: boolean;
  setIsCancelSubscriptionModalOpen: (isCancelSubscriptionModalOpen: boolean) => void;
  cancellingSubscription: boolean;
  cancelSubscription: () => void;
  planName: string;
  planInfo: string;
  currentUsage: number;
  userType?: UserType;
}

const CancelSubscription = ({
  individualPlan,
  isCancelSubscriptionModalOpen,
  setIsCancelSubscriptionModalOpen,
  cancellingSubscription,
  cancelSubscription,
  planName,
  planInfo,
  currentUsage,
  userType = UserType.Individual,
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
        cancelSubscription={cancelSubscription}
        currentPlanName={planName}
        currentPlanInfo={planInfo}
        currentUsage={currentUsage}
        userType={userType}
      />
    </section>
  );
};

export default CancelSubscription;
