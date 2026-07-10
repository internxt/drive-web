import { StoragePlan, UserType } from '@internxt/sdk/dist/drive/payments/types/types';
import { Button, Modal } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { dateService } from 'services';
import PlanChangeOption from './PlanChangeOption';

interface CancelPlanModalProps {
  currentPlanName: string;
  currentPlanInfo: string;
  currentUsage: number;
  userType: UserType;
  isCancellingSubscription: boolean;
  individualPlan: StoragePlan | null;
  isCancelPlanModalDialogOpen: boolean;
  onOpenCancelRenewalDialog: () => void;
  onOpenEndPlanNowDialog?: () => void;
  onClose: () => void;
}

const CancelPlanModal = ({
  currentPlanName,
  currentPlanInfo,
  currentUsage,
  isCancellingSubscription,
  userType,
  individualPlan,
  isCancelPlanModalDialogOpen,
  onOpenCancelRenewalDialog,
  onOpenEndPlanNowDialog,
  onClose,
}: CancelPlanModalProps): JSX.Element => {
  const { translate } = useTranslationContext();

  const commitment = individualPlan?.commitment;
  const earlyCancellationFee = commitment?.earlyCancellationFee;
  const cancellationDate = commitment?.cancellationDate;
  const remainingMonths = commitment?.remainingMonths;

  const commitmentRenewal = cancellationDate && dateService.format(cancellationDate, 'DD MMM YYYY');

  const title = translate('views.account.tabs.billing.cancelSubscriptionModal.title');
  const description = {
    line1: translate('views.account.tabs.billing.cancelSubscriptionModal.description.individual.line1', {
      endDate: commitmentRenewal,
    }),

    line2: translate('views.account.tabs.billing.cancelSubscriptionModal.description.individual.line2'),
  };

  const cancelRenewalBulletedInfo = [
    translate('views.account.tabs.billing.cancelSubscriptionModal.options.cancelRenewal.bulletedInfo', {
      remainingMonths: remainingMonths,
    }),
  ];
  const endNowBulletedInfo = [
    translate('views.account.tabs.billing.cancelSubscriptionModal.options.endNow.bulletedInfo', {
      amountToPay: earlyCancellationFee,
    }),
  ];

  const cancelRenewalLabel = translate(
    'views.account.tabs.billing.cancelSubscriptionModal.options.cancelRenewal.label',
    {
      endDate: commitmentRenewal,
    },
  );
  const endNowLabel = translate('views.account.tabs.billing.cancelSubscriptionModal.options.endNow.label');

  return (
    <Modal isOpen={isCancelPlanModalDialogOpen} onClose={onClose} maxWidth="w-max">
      <div className="flex flex-col w-full gap-5">
        <h4 className="text-2xl font-medium">{title}</h4>
        <p className="text-gray-100">
          {description.line1} <br /> {description.line2}
        </p>

        <div className="flex w-full flex-col gap-4 sm:flex-row">
          <PlanChangeOption
            title={translate('views.account.tabs.billing.cancelSubscriptionModal.options.cancelRenewal.title')}
            description={translate(
              'views.account.tabs.billing.cancelSubscriptionModal.options.cancelRenewal.description',
              { endDate: commitmentRenewal },
            )}
            currentPlanName={currentPlanName}
            currentPlanInfo={currentPlanInfo}
            afterLabel={cancelRenewalLabel}
            ctaLabel={translate('views.account.tabs.billing.cancelSubscriptionModal.options.cancelRenewal.cta')}
            onConfirm={onOpenCancelRenewalDialog}
            disabled={isCancellingSubscription}
            variantButtonAction="secondary"
            bulletedInfo={cancelRenewalBulletedInfo}
          />
          {onOpenEndPlanNowDialog && remainingMonths && remainingMonths > 1 && (
            <PlanChangeOption
              title={translate('views.account.tabs.billing.cancelSubscriptionModal.options.endNow.title')}
              description={translate('views.account.tabs.billing.cancelSubscriptionModal.options.endNow.description')}
              currentPlanName={currentPlanName}
              currentPlanInfo={currentPlanInfo}
              afterLabel={endNowLabel}
              ctaLabel={translate('views.account.tabs.billing.cancelSubscriptionModal.options.endNow.cta')}
              onConfirm={onOpenEndPlanNowDialog}
              disabled={isCancellingSubscription}
              variantButtonAction="ghost"
              bulletedInfo={endNowBulletedInfo}
            />
          )}
        </div>

        <div className="flex justify-end">
          <Button className="shadow-subtle-hard" disabled={isCancellingSubscription} onClick={onClose}>
            {translate('views.account.tabs.billing.cancelSubscriptionModal.keepSubscription')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CancelPlanModal;
