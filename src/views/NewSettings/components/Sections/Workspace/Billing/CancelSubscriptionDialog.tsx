import { StoragePlan, UserType } from '@internxt/sdk/dist/drive/payments/types/types';
import CancelPlanModal from './components/cancelSubscription/paidPlanCancellation/CancelPlanModal';
import { useEffect, useState } from 'react';
import CancelRenewalModal from './components/cancelSubscription/paidPlanCancellation/CancelRenewalModal';
import EndPlanNowModal from './components/cancelSubscription/paidPlanCancellation/EndPlanNowModal';
import { CancellationIncentive } from './CancellationIncentive';
import { dateService } from 'services';
import SimpleCancelSubscriptionModal from './components/cancelSubscription/SimpleCancelSubscriptionModal';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

type View = 'simpleCancelSub' | 'cancelPlan' | 'cancelRenewal' | 'endPlanNow' | 'cancellationIncentive';

interface CancelSubscriptionModalProps {
  individualPlan: StoragePlan | null;
  isOpen: boolean;
  onClose: () => void;
  currentPlanName: string;
  currentPlanInfo: string;
  currentUsage: number;
  isCancellingSubscription: boolean;
  isApplyingTrial?: boolean;
  nextBillingDate?: string;
  userType: UserType;
  cancelSubscription: () => void;
  activateTrial?: () => void;
  earlyCancellationClientSecret?: string | null;
  earlyCancelSubscription?: () => void;
  onEarlyCancellationConfirmed?: () => void;
}

const CancelSubscriptionDialog = ({
  individualPlan,
  isOpen,
  currentPlanName,
  currentPlanInfo,
  currentUsage,
  isCancellingSubscription,
  isApplyingTrial = false,
  nextBillingDate,
  userType = UserType.Individual,
  activateTrial = () => undefined,
  cancelSubscription,
  earlyCancellationClientSecret,
  earlyCancelSubscription,
  onEarlyCancellationConfirmed,
  onClose,
}: CancelSubscriptionModalProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const [view, setView] = useState<View>('cancelPlan');

  const isBusiness = userType === UserType.Business;
  const commitment = individualPlan?.commitment;
  const cancellationTrial = individualPlan?.cancellationTrial;
  const isCommitmentEnabled = commitment?.enabled;
  const isCancellationTrialRedeemed = cancellationTrial?.redeemed;
  const isElegibleForCancellation = commitment?.isElegibleForCancellation;
  const commitmentRenewal =
    commitment?.cancellationDate && dateService.format(commitment?.cancellationDate, 'DD MMM YYYY');
  const shouldDisplayCancellationIncentiveDialog = isCommitmentEnabled && !isCancellationTrialRedeemed;

  const cancelLegacySubscriptionDescription = isBusiness
    ? translate('views.account.tabs.billing.cancelSubscriptionModal.description.business')
    : translate('views.account.tabs.billing.cancelSubscriptionModal.commitment.firstMonthDescription');

  useEffect(() => {
    if (shouldDisplayCancellationIncentiveDialog) {
      setView('cancellationIncentive');
    } else if (isBusiness || isElegibleForCancellation) {
      setView('simpleCancelSub');
    }
  }, [isCommitmentEnabled, isCancellationTrialRedeemed, userType]);

  const isModalOpen = (currentView: View) => isOpen && view === currentView;

  const onOpenCancelRenewalDialog = () => {
    setView('cancelRenewal');
  };

  const onCloseCancelRenewalDialog = () => {
    setView('cancelPlan');
  };

  const onOpenEndPlanNowDialog = () => {
    setView('endPlanNow');
  };

  const onCloseEndPlanNowDialog = () => {
    setView('cancelPlan');
  };

  return (
    <>
      <SimpleCancelSubscriptionModal
        isOpen={isOpen && isModalOpen('simpleCancelSub')}
        isCancellingSubscription={isCancellingSubscription}
        description={cancelLegacySubscriptionDescription}
        cancelSubscription={cancelSubscription}
        onClose={onClose}
      />
      <CancellationIncentive
        isOpen={isOpen && isModalOpen('cancellationIncentive')}
        isApplyingTrial={isApplyingTrial}
        isCancellingSubscription={isCancellingSubscription}
        nextBillingDate={nextBillingDate}
        onClose={onClose}
        cancelSubscription={cancelSubscription}
        activateTrial={activateTrial}
      />
      <CancelPlanModal
        isCancelPlanModalDialogOpen={isOpen && isModalOpen('cancelPlan')}
        currentPlanName={currentPlanName}
        userType={userType}
        onClose={onClose}
        onOpenCancelRenewalDialog={onOpenCancelRenewalDialog}
        onOpenEndPlanNowDialog={earlyCancelSubscription ? onOpenEndPlanNowDialog : undefined}
        isCancellingSubscription={isCancellingSubscription}
        currentPlanInfo={currentPlanInfo}
        currentUsage={currentUsage}
        individualPlan={individualPlan}
      />
      <CancelRenewalModal
        isCancelRenewalOpen={isOpen && isModalOpen('cancelRenewal')}
        isCancellingSubscription={isCancellingSubscription}
        commitmentRenewal={commitmentRenewal}
        onGoBack={onCloseCancelRenewalDialog}
        cancelSubscription={cancelSubscription}
      />
      {earlyCancelSubscription && onEarlyCancellationConfirmed && (
        <EndPlanNowModal
          isOpen={isOpen && isModalOpen('endPlanNow')}
          currentPlanName={currentPlanName}
          currentPlanInfo={currentPlanInfo}
          currentUsage={currentUsage}
          amountToPay={commitment?.earlyCancellationFee}
          isCancellingSubscription={isCancellingSubscription}
          earlyCancellationClientSecret={earlyCancellationClientSecret ?? null}
          onEarlyCancel={earlyCancelSubscription}
          onEarlyCancellationConfirmed={onEarlyCancellationConfirmed}
          onGoBack={onCloseEndPlanNowDialog}
        />
      )}
    </>
  );
};

export default CancelSubscriptionDialog;
