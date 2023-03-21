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

const Step1 = ({
  currentPlanName,
  currentPlanInfo,
  currentPlanLimit,
  currentUsage,
  setStep,
  onClose,
}: {
  currentPlanName: string;
  currentPlanInfo: string;
  currentPlanLimit: number;
  currentUsage: number;
  setStep: Dispatch<SetStateAction<2 | 1>>;
  onClose: () => void;
}): JSX.Element => {
  const { translate } = useTranslationContext();

  const isCurrentUsageGreaterThanFreePlan = currentUsage !== -1 && currentUsage >= currentPlanLimit;

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
  const [feedbackSelected, setFeedbackSelected] = useState<string>('');
  const [otherFeedback, setOtherFeedback] = useState<string>('');

  const MAX_OTHERFEEDBACK_LENGTH = 1000;

  const feedbackOptions = [
    {
      id: 'TooExpensive',
      title: translate('views.account.tabs.billing.cancelSubscriptionModal.feedback.tooExpensive'),
    },
    {
      id: 'LackOfFeatures',
      title: translate('views.account.tabs.billing.cancelSubscriptionModal.feedback.lackOfFeatures'),
    },
    {
      id: 'WantTryAnother',
      title: translate('views.account.tabs.billing.cancelSubscriptionModal.feedback.wantTryAnother'),
    },
    {
      id: 'JustTrying',
      title: translate('views.account.tabs.billing.cancelSubscriptionModal.feedback.justTrying'),
    },
    {
      id: 'Other',
      title: translate('views.account.tabs.billing.cancelSubscriptionModal.feedback.other'),
    },
  ];

  const feedbackList = feedbackOptions.map((feedbackElement) => {
    return (
      <div className="mt-2" key={'div-' + feedbackElement.id}>
        <label
          className="flex flex-row items-center"
          onClick={() => {
            setFeedbackSelected(feedbackElement.id);
          }}
        >
          <input
            type="checkbox"
            checked={feedbackSelected === feedbackElement.id}
            readOnly
            className="checkbox-rounded"
          />
          <p className="ml-2 text-base font-medium">{feedbackElement.title}</p>
        </label>
      </div>
    );
  });

  const isFeedbackSelectedOther = () => feedbackSelected === 'Other';

  return (
    <>
      <p className="mt-4 text-gray-100">
        {translate('views.account.tabs.billing.cancelSubscriptionModal.giveUsFeedback', {
          currentPlanName,
        })}
      </p>
      <div className="mt-2">{feedbackList}</div>
      {isFeedbackSelectedOther() && (
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
      )}

      <div className="mt-4 flex justify-end">
        <Button
          loading={cancellingSubscription}
          disabled={isFeedbackSelectedOther() && otherFeedback.length > MAX_OTHERFEEDBACK_LENGTH}
          variant="secondary"
          className="shadow-subtle-hard"
          onClick={() => {
            if (isFeedbackSelectedOther()) {
              cancelSubscription(otherFeedback.trim());
            } else {
              cancelSubscription(feedbackSelected);
            }
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
