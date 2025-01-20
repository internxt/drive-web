import { UserType } from '@internxt/sdk/dist/drive/payments/types';
import { ArrowRight } from '@phosphor-icons/react';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import sizeService from '../../../../drive/services/size.service';
import { FreeStoragePlan } from '../../../../drive/types';
import { useTranslationContext } from '../../../../i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from '../../../../notifications/services/notifications.service';
import paymentService from '../../../../payment/services/payment.service';
import { Button } from '@internxt/ui';
import Modal from '../../../../shared/components/Modal';
import { useAppDispatch } from '../../../../store/hooks';
import { planThunks } from '../../../../store/slices/plan';

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlanName: string;
  currentPlanInfo: string;
  currentUsage: number;
  cancellingSubscription: boolean;
  userType: UserType;
  cancelSubscription: (userType?: UserType) => void;
}

const CancelSubscriptionModal = ({
  isOpen,
  onClose,
  currentPlanName,
  currentPlanInfo,
  currentUsage,
  cancellingSubscription,
  cancelSubscription,
  userType = UserType.Individual,
}: CancelSubscriptionModalProps): JSX.Element => {
  const isIndividual = userType === UserType.Individual;
  const { translate } = useTranslationContext();
  const [step, setStep] = useState<1 | 2>(2);
  const [couponAvailable, setCouponAvailable] = useState(false);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (userType === UserType.Individual && isOpen)
      paymentService
        .requestPreventCancellation()
        .then((response) => {
          setCouponAvailable(response.elegible);
        })
        .catch((error) => {
          console.error(error);
          notificationsService.show({
            text: translate('notificationMessages.errorApplyCoupon'),
            type: ToastType.Error,
          });
        });
  }, [isOpen]);

  useEffect(() => {
    if (isIndividual && couponAvailable && isOpen) {
      setStep(1);
    }
  }, [couponAvailable]);

  const applyCoupon = async () => {
    try {
      await paymentService.preventCancellation();
      notificationsService.show({ text: translate('notificationMessages.successApplyCoupon') });
      setTimeout(() => {
        dispatch(planThunks.initializeThunk()).unwrap();
      }, 1000);
    } catch (error: any) {
      const errorMessage = JSON.parse(error.message);
      if (errorMessage.message === 'User already applied coupon') {
        notificationsService.show({
          text: translate('notificationMessages.alreadyAppliedCoupon'),
          type: ToastType.Error,
        });
      } else {
        notificationsService.show({
          text: translate('notificationMessages.errorApplyCoupon'),
          type: ToastType.Error,
        });
      }
    } finally {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {isIndividual && step === 1 && (
        <Step1 currentPlanName={currentPlanName} applyCoupon={applyCoupon} setStep={setStep} />
      )}

      {step === 2 && (
        <Step2
          currentPlanName={currentPlanName}
          userType={userType}
          onClose={onClose}
          cancelSubscription={cancelSubscription}
          cancellingSubscription={cancellingSubscription}
          currentPlanInfo={currentPlanInfo}
          currentUsage={currentUsage}
        />
      )}
    </Modal>
  );
};

const Step1 = ({
  currentPlanName,
  setStep,
  applyCoupon,
}: {
  currentPlanName: string;
  setStep: Dispatch<SetStateAction<2 | 1>>;
  applyCoupon: () => void;
}): JSX.Element => {
  const { translate } = useTranslationContext();

  return (
    <>
      <p className="mt-5 text-center text-3xl font-semibold">
        {translate('views.account.tabs.billing.cancelSubscriptionModal.coupon.title')}
      </p>
      <p className="font-regular mb-10 text-center text-7xl text-primary">
        {translate('views.account.tabs.billing.cancelSubscriptionModal.coupon.subtitle')}
      </p>
      <p className="font-regular mt-4 text-lg text-gray-100">
        {translate('views.account.tabs.billing.cancelSubscriptionModal.coupon.text1')}
        <span className="font-semibold"> {currentPlanName} </span>
        {translate('views.account.tabs.billing.cancelSubscriptionModal.coupon.text2')}
      </p>
      <div className="mt-5 flex justify-end">
        <Button
          className={'shadow-subtle-hard'}
          variant="secondary"
          onClick={() => {
            setStep(2);
          }}
        >
          {translate('views.account.tabs.billing.cancelSubscriptionModal.cancelSubscription')}
        </Button>
        <Button
          className="ml-2 shadow-subtle-hard"
          onClick={() => {
            applyCoupon();
          }}
        >
          {translate('views.account.tabs.billing.cancelSubscriptionModal.coupon.continue')}
        </Button>
      </div>
    </>
  );
};

const Step2 = ({
  currentPlanName,
  currentPlanInfo,
  currentUsage,
  cancellingSubscription,
  userType,
  cancelSubscription,
  onClose,
}: {
  currentPlanName: string;
  currentPlanInfo: string;
  currentUsage: number;
  userType: UserType;
  cancellingSubscription: boolean;
  cancelSubscription: () => void;
  onClose: () => void;
}): JSX.Element => {
  const { translate } = useTranslationContext();

  const isCurrentUsageGreaterThanFreePlan = currentUsage !== -1 && currentUsage >= FreeStoragePlan.storageLimit;

  return (
    <>
      <p className="mt-4 text-gray-100">
        {translate(`views.account.tabs.billing.cancelSubscriptionModal.description.${userType.toLowerCase()}`, {
          currentPlanName,
          freePlanName: FreeStoragePlan.simpleName,
        })}
      </p>
      {userType !== UserType.Business && (
        <div className="mt-5 flex w-full max-w-lg flex-row items-center justify-center pb-3">
          <div className="flex w-40 flex-col items-center justify-center rounded-xl border border-gray-10 p-3 shadow-subtle-hard">
            <div className="mt-3 rounded-xl border border-gray-10 bg-gray-1">
              <span className="p-2 pb-1.5 pt-1.5">
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
          <div className="flex w-40 flex-col items-center justify-center rounded-xl border border-gray-10 p-3 shadow-subtle-hard">
            <div className="mt-3 rounded-xl border border-gray-10 bg-gray-1">
              <span className="p-2 pb-1.5 pt-1.5">
                {translate('views.account.tabs.billing.cancelSubscriptionModal.infoBox.titleNew')}
              </span>
            </div>
            <div className="mt-3">
              <span
                className={`text-2xl font-bold text-primary ${isCurrentUsageGreaterThanFreePlan ? 'text-red' : ''}`}
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
      )}

      {isCurrentUsageGreaterThanFreePlan && (
        <div className="mt-5 flex w-full max-w-lg flex-col rounded-xl border border-red/30 bg-red/10 pb-3 pt-3">
          <div className="flex items-center justify-center p-3">
            <span className="text-lg font-bold text-red">
              {translate('views.account.tabs.billing.cancelSubscriptionModal.infoBox.reachedFreeLimit', {
                freePlanName: FreeStoragePlan.simpleName,
              })}
            </span>
          </div>
          <div className="flex items-center justify-center p-3">
            <span className="font-medium text-red">
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
