import { Button, Modal } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import dayjs from 'dayjs';

interface CancellationIncentiveProps {
  isOpen: boolean;
  cancellingSubscription: boolean;
  applyingTrial: boolean;
  onClose: () => void;
  cancelSubscription: () => void;
  activateTrial: () => void;
}

export const CancellationIncentive = ({
  isOpen,
  applyingTrial,
  cancellingSubscription,
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
            newDate: dayjs().add(30, 'day').format('DD/MM/YYYY'),
          })}
        </p>
      </div>
      <div className="flex flex-row w-full justify-center items-center gap-5">
        <Button
          variant="secondary"
          onClick={cancelSubscription}
          disabled={cancellingSubscription}
          loading={cancellingSubscription}
        >
          {translate('views.account.tabs.billing.cancellationIncentive.cta.cancel')}
        </Button>
        <Button variant="primary" onClick={activateTrial} disabled={applyingTrial} loading={applyingTrial}>
          {translate('views.account.tabs.billing.cancellationIncentive.cta.freeMonth')}
        </Button>
      </div>
    </Modal>
  );
};
