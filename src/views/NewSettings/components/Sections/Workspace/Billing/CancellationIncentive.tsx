import { Button, Modal } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

// Needs to parse the date in the format DD/MM/YY so we can calculate the next billing date
dayjs.extend(customParseFormat);

const NEXT_BILLING_DATE_FORMAT = 'DD/MM/YY';
const FREE_TRIAL_EXTRA_DAYS = 30;

interface CancellationIncentiveProps {
  isOpen: boolean;
  isCancellingSubscription: boolean;
  isApplyingTrial: boolean;
  nextBillingDate?: string;
  onClose: () => void;
  cancelSubscription: () => void;
  activateTrial: () => void;
}

export const CancellationIncentive = ({
  isOpen,
  isApplyingTrial,
  isCancellingSubscription,
  nextBillingDate,
  activateTrial,
  cancelSubscription,
  onClose,
}: CancellationIncentiveProps) => {
  const { translate } = useTranslationContext();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-[480px]"
      className="flex flex-col items-center justify-center px-5 py-10 gap-5"
    >
      <div className="flex flex-col text-center">
        <p className="text-3xl font-bold text-gray-100">
          {translate('views.account.tabs.billing.cancellationIncentive.title.normal')}
        </p>
        <p className="text-8xl font-semibold text-primary">
          {translate('views.account.tabs.billing.cancellationIncentive.title.blue')}
        </p>
      </div>
      <div className="flex flex-col text-center">
        <p className="text-lg">
          {translate('views.account.tabs.billing.cancellationIncentive.description', {
            newDate: dayjs(nextBillingDate, NEXT_BILLING_DATE_FORMAT)
              .add(FREE_TRIAL_EXTRA_DAYS, 'day')
              .format('DD/MM/YYYY'),
          })}
        </p>
      </div>
      <div className="flex flex-row w-full justify-center items-center gap-5">
        <Button
          variant="secondary"
          onClick={cancelSubscription}
          disabled={isCancellingSubscription}
          loading={isCancellingSubscription}
        >
          {translate('views.account.tabs.billing.cancellationIncentive.cta.cancel')}
        </Button>
        <Button variant="primary" onClick={activateTrial} disabled={isApplyingTrial} loading={isApplyingTrial}>
          {translate('views.account.tabs.billing.cancellationIncentive.cta.freeMonth')}
        </Button>
      </div>
    </Modal>
  );
};
