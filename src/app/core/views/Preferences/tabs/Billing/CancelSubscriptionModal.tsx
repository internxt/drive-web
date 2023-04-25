import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { ArrowRight } from 'phosphor-react';
import { useTranslationContext } from '../../../../../i18n/provider/TranslationProvider';
import Button from '../../../../../shared/components/Button/Button';
import Modal from '../../../../../shared/components/Modal';
import { FreeStoragePlan } from '../../../../../drive/types';
import sizeService from '../../../../../drive/services/size.service';

const CancelSubscriptionModal = ({
  isOpen,
  onClose,
  currentPlanName,
  currentPlanInfo,
  currentUsage,
  cancellingSubscription,
  cancelSubscription,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentPlanName: string;
  currentPlanInfo: string;
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

const Step1 = ({
  currentPlanName,
  currentPlanInfo,
  currentUsage,
  setStep,
  onClose,
}: {
  currentPlanName: string;
  currentPlanInfo: string;
  currentUsage: number;
  setStep: Dispatch<SetStateAction<2 | 1>>;
  onClose: () => void;
}): JSX.Element => {
  const { translate } = useTranslationContext();

  const isCurrentUsageGreaterThanFreePlan = currentUsage !== -1 && currentUsage >= FreeStoragePlan.storageLimit;

  return (
    <>
      <p className="mt-4 text-gray-100">
        {translate('views.account.tabs.billing.cancelSubscriptionModal.description', {
          currentPlanName,
          freePlanName: FreeStoragePlan.simpleName,
        })}
      </p>
      <div className="mt-5 flex w-full max-w-lg flex-row items-center justify-center pb-3">
        <div className="flex w-40 flex-col items-center justify-center rounded-12px border border-gray-10 p-3 shadow-subtle-hard">
          <div className="mt-3 rounded-xl border border-gray-10 bg-gray-1">
            <span className="p-2 pt-1.5 pb-1.5">
              {translate('views.account.tabs.billing.cancelSubscriptionModal.infoBox.titleCurrent')}
            </span>
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
        <div className="flex w-40 flex-col items-center justify-center rounded-12px border border-gray-10 p-3 shadow-subtle-hard">
          <div className="mt-3 rounded-xl border border-gray-10 bg-gray-1">
            <span className="p-2 pt-1.5 pb-1.5">
              {translate('views.account.tabs.billing.cancelSubscriptionModal.infoBox.titleNew')}
            </span>
          </div>
          <div className="mt-3">
            <span
              className={`text-2xl font-bold text-primary ${isCurrentUsageGreaterThanFreePlan ? 'text-red-std' : ''}`}
            >
              {FreeStoragePlan.simpleName}
            </span>
          </div>
          <div>
            <span className="font-medium">
              {translate('views.account.tabs.billing.cancelSubscriptionModal.infoBox.free')}
            </span>
          </div>
        </div>
      </div>

      {isCurrentUsageGreaterThanFreePlan && (
        <div className="mt-5 flex w-full max-w-lg flex-col rounded-12px border border-red-30 bg-red-10 pt-3 pb-3">
          <div className="flex items-center justify-center p-3">
            <span className="text-lg font-bold text-red-std">
              {translate('views.account.tabs.billing.cancelSubscriptionModal.infoBox.reachedFreeLimit', {
                freePlanName: FreeStoragePlan.simpleName,
              })}
            </span>
          </div>
          <div className="flex items-center justify-center p-3">
            <span className="font-medium text-red-std">
              {translate('views.account.tabs.billing.cancelSubscriptionModal.infoBox.reachedFreeLimitDescription', {
                currentUsage: sizeService.bytesToString(currentUsage),
              })}
            </span>
          </div>
        </div>
      )}
      <div className="mt-5 flex justify-end">
        <Button
          className={'shadow-subtle-hard'}
          variant="secondary"
          onClick={() => {
            setStep(2);
          }}
        >
          {translate('views.account.tabs.billing.cancelSubscriptionModal.continue')}
        </Button>
        <Button className="ml-2 shadow-subtle-hard" onClick={onClose}>
          {translate('views.account.tabs.billing.cancelSubscriptionModal.keepSubscription')}
        </Button>
      </div>
    </>
  );
};

const Step2 = ({
  currentPlanName,
  onClose,
  cancellingSubscription,
  cancelSubscription,
}: {
  currentPlanName: string;
  onClose: () => void;
  cancellingSubscription: boolean;
  cancelSubscription: (feedback: string) => void;
}): JSX.Element => {
  const { translate } = useTranslationContext();
  const [otherFeedback, setOtherFeedback] = useState<string>('');

  const MAX_OTHERFEEDBACK_LENGTH = 1000;

  return (
    <>
      <p className="mt-4 text-gray-100">
        {translate('views.account.tabs.billing.cancelSubscriptionModal.giveUsFeedback', {
          currentPlanName,
        })}
      </p>
      <div>
        <textarea
          disabled={cancellingSubscription}
          value={otherFeedback}
          placeholder={translate('views.account.tabs.billing.cancelSubscriptionModal.feedback.placeholder')}
          rows={4}
          className="outline-none mt-4 w-full max-w-lg resize-none rounded-6px border border-gray-20 p-3 pl-4"
          onChange={(e) => setOtherFeedback(String(e.target.value))}
        />
        <div className="flex w-full max-w-lg justify-end">
          <span className={`text-sm ${(otherFeedback.length > MAX_OTHERFEEDBACK_LENGTH && 'text-red-std') || ''}`}>
            {otherFeedback.length}/{MAX_OTHERFEEDBACK_LENGTH}
          </span>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          loading={cancellingSubscription}
          disabled={otherFeedback.length > MAX_OTHERFEEDBACK_LENGTH || otherFeedback.length <= 0}
          variant="secondary"
          className="shadow-subtle-hard"
          onClick={() => {
            cancelSubscription(otherFeedback.trim());
          }}
        >
          {translate('views.account.tabs.billing.cancelSubscriptionModal.cancelSubscription')}
        </Button>
        <Button disabled={cancellingSubscription} className="ml-2 shadow-subtle-hard" onClick={onClose}>
          {translate('views.account.tabs.billing.cancelSubscriptionModal.keepSubscription')}
        </Button>
      </div>
    </>
  );
};

export default CancelSubscriptionModal;
