import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import Button from 'app/shared/components/Button/Button';
import Modal from 'app/shared/components/Modal';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { FreeStoragePlan } from 'app/drive/types';
import { ArrowRight } from 'phosphor-react';
import sizeService from 'app/drive/services/size.service';

const CancelSubscriptionModal = ({
  isOpen,
  onClose,
  currentPlanName,
  currentPlanInfo,
  currentPlanLimit,
  currentUsage,
  cancellingSubscription,
  cancelSubscription,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentPlanName: string;
  currentPlanInfo: string;
  currentPlanLimit: number;
  currentUsage: number;
  cancellingSubscription: boolean;
  cancelSubscription: (feedback: string) => void;
}): JSX.Element => {
  const { translate } = useTranslationContext();
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
    }
  }, [isOpen]);

  console.log({ currentUsage });

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h1 className="text-2xl font-medium text-gray-80">
        {translate('views.account.tabs.billing.cancelSubscriptionModal.title')}
      </h1>
      <h2 className="text-base font-light text-gray-50">{step} of 2</h2>
      {step === 1 ? (
        <Step1
          currentPlanName={currentPlanName}
          onClose={onClose}
          setStep={setStep}
          currentPlanInfo={currentPlanInfo}
          currentPlanLimit={currentPlanLimit}
          currentUsage={currentUsage}
        />
      ) : (
        <Step2
          currentPlanName={currentPlanName}
          onClose={onClose}
          cancellingSubscription={cancellingSubscription}
          cancelSubscription={cancelSubscription}
        />
      )}
    </Modal>
  );
};
