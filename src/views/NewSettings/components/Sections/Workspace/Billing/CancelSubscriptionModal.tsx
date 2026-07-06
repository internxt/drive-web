import { StoragePlan, UserType } from '@internxt/sdk/dist/drive/payments/types/types';
import { ArrowRight } from '@phosphor-icons/react';
import { FreeStoragePlan } from 'app/drive/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { Button, Modal } from '@internxt/ui';
import { dateService } from 'services';
import { CancellationIncentive } from './CancellationIncentive';

interface CancelSubscriptionModalProps {
  individualPlan: StoragePlan | null;
  isOpen: boolean;
  onClose: () => void;
  currentPlanName: string;
  currentPlanInfo: string;
  currentUsage: number;
  cancellingSubscription: boolean;
  applyingTrial?: boolean;
  userType: UserType;
  cancelSubscription: (userType?: UserType) => void;
  activateTrial?: () => void;
}

const CancelSubscriptionModal = ({
  individualPlan,
  isOpen,
  currentPlanName,
  currentPlanInfo,
  currentUsage,
  cancellingSubscription,
  applyingTrial = false,
  userType = UserType.Individual,
  activateTrial = () => undefined,
  cancelSubscription,
  onClose,
}: CancelSubscriptionModalProps): JSX.Element => {
  const commitment = individualPlan?.commitment;
  const cancellationTrial = individualPlan?.cancellationTrial;
  const isCommitmentEnabled = commitment?.enabled;
  const isCancellationTrialRedeemed = cancellationTrial?.redeemed;
  const shouldDisplayCancellationIncentiveDialog = isCommitmentEnabled && !isCancellationTrialRedeemed;

  if (shouldDisplayCancellationIncentiveDialog)
    return (
      <CancellationIncentive
        isOpen={isOpen}
        applyingTrial={applyingTrial}
        cancellingSubscription={cancellingSubscription}
        onClose={onClose}
        cancelSubscription={cancelSubscription}
        activateTrial={activateTrial}
      />
    );

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <CancelPlanModal
        currentPlanName={currentPlanName}
        userType={userType}
        onClose={onClose}
        cancelSubscription={cancelSubscription}
        cancellingSubscription={cancellingSubscription}
        currentPlanInfo={currentPlanInfo}
        currentUsage={currentUsage}
        individualPlan={individualPlan}
      />
    </Modal>
  );
};

interface CancelPlanModalProps {
  currentPlanName: string;
  currentPlanInfo: string;
  currentUsage: number;
  userType: UserType;
  cancellingSubscription: boolean;
  individualPlan: StoragePlan | null;
  cancelSubscription: () => void;
  onClose: () => void;
}

const CancelPlanModal = ({
  currentPlanName,
  currentPlanInfo,
  currentUsage,
  cancellingSubscription,
  userType,
  individualPlan,
  cancelSubscription,
  onClose,
}: CancelPlanModalProps): JSX.Element => {
  const { translate } = useTranslationContext();

  const monthlyAmount = individualPlan?.monthlyPrice;
  const commitment = individualPlan?.commitment;
  const isCommitmentEnabled = commitment?.enabled;
  const remainingMonths = commitment?.remainingMonths;
  const commitmentRenewal =
    commitment?.cancellationDate && dateService.format(commitment?.cancellationDate, 'DD MMM YYYY');
  const isElegibleForCancellation = commitment?.isElegibleForCancellation;
  const shouldDisplayCommitmentText = isCommitmentEnabled && !isElegibleForCancellation;

  const commitmentFirstMonthCancellationDescription = translate(
    'views.account.tabs.billing.cancelSubscriptionModal.commitment.firstMonthDescription',
  );
  const normalDescription = isCommitmentEnabled
    ? translate('views.account.tabs.billing.cancelSubscriptionModal.commitment.description', {
        end_date: commitmentRenewal,
      })
    : translate(`views.account.tabs.billing.cancelSubscriptionModal.description.${userType.toLowerCase()}`, {
        currentPlanName,
        freePlanName: FreeStoragePlan.simpleName,
      });

  const description = isElegibleForCancellation ? commitmentFirstMonthCancellationDescription : normalDescription;

  const commitmentList = [
    translate('views.account.tabs.billing.cancelSubscriptionModal.commitment.monthsRemaining', {
      monthsRemaining: remainingMonths,
    }),
    translate('views.account.tabs.billing.cancelSubscriptionModal.commitment.amountPerMonth', {
      amount: monthlyAmount?.toFixed(2),
    }),
  ];

  return (
    <>
      <p className="mt-4 text-lg text-gray-100">{description}</p>

      {shouldDisplayCommitmentText && (
        <ul className="py-5 list-disc pl-10">
          {commitmentList.map((item) => (
            <li key={item} className="text-lg text-gray-100">
              {item}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex w-full max-w-lg flex-row items-center justify-center pb-3">
        <div className="flex w-40 flex-col items-center justify-center rounded-xl border border-gray-10 p-3 shadow-subtle-hard">
          <div className="mt-3 rounded-xl border border-gray-10 bg-gray-1">
            <p className="py-0.5 px-1.5 text-xs font-medium">
              {translate('views.account.tabs.billing.cancelSubscriptionModal.infoBox.titleCurrent')}
            </p>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-primary">{currentPlanName}</span>
          </div>
          <div>
            <span className="font-medium">{currentPlanInfo}</span>
          </div>
        </div>
        <div className="flex w-20 flex-col items-center justify-center p-3">
          <div className="">
            <ArrowRight height="20" width="20" />
          </div>
        </div>
        <div className="flex w-40 flex-col items-center justify-center rounded-xl border border-gray-10 p-3 shadow-subtle-hard">
          <div className="mt-3 rounded-xl border border-gray-10 bg-gray-1">
            <p className="py-0.5 px-1.5 text-xs font-medium">
              {shouldDisplayCommitmentText
                ? translate('views.account.tabs.billing.cancelSubscriptionModal.commitment.afterLabel', {
                    monthsRemaining: commitmentRenewal,
                  })
                : translate('views.account.tabs.billing.cancelSubscriptionModal.infoBox.titleNew')}
            </p>
          </div>
          <div className="mt-3">
            <span className={'text-2xl font-bold text-primary'}>{FreeStoragePlan.simpleName}</span>
          </div>
          <div>
            <span className="font-medium">
              {translate('views.account.tabs.billing.cancelSubscriptionModal.infoBox.free')}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button
          className={'shadow-su0btle-hard'}
          variant="secondary"
          disabled={cancellingSubscription}
          onClick={cancelSubscription}
        >
          {translate('views.account.tabs.billing.cancelSubscriptionModal.cancelSubscription')}
        </Button>
        <Button className="ml-2 shadow-subtle-hard" disabled={cancellingSubscription} onClick={onClose}>
          {translate('views.account.tabs.billing.cancelSubscriptionModal.keepSubscription')}
        </Button>
      </div>
    </>
  );
};

export default CancelSubscriptionModal;
