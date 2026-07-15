import { t } from 'i18next';
import { useState } from 'react';
import { UserType } from '@internxt/sdk/dist/drive/payments/types/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import longNotificationsService from 'app/notifications/services/longNotification.service';
import { paymentService } from 'views/Checkout/services';
import { useAppDispatch } from 'app/store/hooks';
import { planThunks } from 'app/store/slices/plan';
import { errorService } from 'services';

interface UseSubscriptionCancellationOptions {
  onModalClose?: () => void;
  onCancelSuccess?: () => void;
}

interface UseSubscriptionCancellationResult {
  isCancellingSubscription: boolean;
  isApplyingTrial: boolean;
  earlyCancellationClientSecret: string | null;
  isReactivatingSubscription: boolean;
  cancelSubscription: (userType?: UserType) => Promise<void>;
  earlyCancelSubscription: () => Promise<void>;
  onEarlyCancellationConfirmed: () => void;
  activateTrial: () => Promise<void>;
  reactivateUserSubscription: () => Promise<void>;
}

const REFRESH_PLAN_DELAY_MS = 1000;

export const useSubscriptionCancellation = ({
  onModalClose,
  onCancelSuccess,
}: UseSubscriptionCancellationOptions): UseSubscriptionCancellationResult => {
  const dispatch = useAppDispatch();
  const [isCancellingSubscription, setIsCancellingSubscription] = useState<boolean>(false);
  const [isApplyingTrial, setIsApplyingTrial] = useState<boolean>(false);
  const [isReactivatingSubscription, setIsReactivatingSubscription] = useState<boolean>(false);
  const [earlyCancellationClientSecret, setEarlyCancellationClientSecret] = useState<string | null>(null);

  const refreshPlan = () => {
    setTimeout(() => {
      dispatch(planThunks.initializeThunk()).unwrap();
    }, REFRESH_PLAN_DELAY_MS);
  };

  const cancelSubscription = async (userType?: UserType) => {
    setIsCancellingSubscription(true);
    try {
      await paymentService.cancelSubscription(userType);
      notificationsService.show({ text: t('notificationMessages.successCancelSubscription') });
      onModalClose?.();
    } catch (error) {
      const castedError = errorService.castError(error);
      errorService.reportError(error);
      notificationsService.show({
        text: t('notificationMessages.errorCancelSubscription'),
        type: ToastType.Error,
        requestId: castedError.requestId,
      });
    } finally {
      setIsCancellingSubscription(false);
      refreshPlan();
      onCancelSuccess?.();
    }
  };

  const activateTrial = async () => {
    setIsApplyingTrial(true);
    try {
      await paymentService.applyCancellationTrial();
      longNotificationsService.show({ text: t('notificationMessages.successApplyCancellationIncentive') });
      onModalClose?.();
    } catch (error) {
      const castedError = errorService.castError(error);
      errorService.reportError(error);
      notificationsService.show({
        text: t('notificationMessages.errorApplyCancellationIncentive'),
        type: ToastType.Error,
        requestId: castedError.requestId,
      });
    } finally {
      setIsApplyingTrial(false);
      refreshPlan();
    }
  };

  const earlyCancelSubscription = async () => {
    setIsCancellingSubscription(true);
    try {
      const { clientSecret } = await paymentService.cancelSubscriptionEarly();
      setEarlyCancellationClientSecret(clientSecret);
    } catch (error) {
      const castedError = errorService.castError(error);
      errorService.reportError(error);
      notificationsService.show({
        text: t('notificationMessages.errorEarlyCancelSubscription'),
        type: ToastType.Error,
        requestId: castedError.requestId,
      });
      setIsCancellingSubscription(false);
    }
  };

  const onEarlyCancellationConfirmed = () => {
    setEarlyCancellationClientSecret(null);
    setIsCancellingSubscription(false);
    notificationsService.show({ text: t('notificationMessages.successEarlyCancelSubscription') });
    refreshPlan();
    onModalClose?.();
  };

  const reactivateUserSubscription = async () => {
    setIsReactivatingSubscription(true);
    try {
      await paymentService.reactivateUserSubscription();
      notificationsService.show({ text: t('notificationMessages.successReactivateSubscription') });
      onModalClose?.();
    } catch (error) {
      const castedError = errorService.castError(error);
      errorService.reportError(error);
      notificationsService.show({
        text: t('notificationMessages.errorReactivateSubscription'),
        type: ToastType.Error,
        requestId: castedError.requestId,
      });
    } finally {
      setIsReactivatingSubscription(false);
      refreshPlan();
    }
  };

  return {
    isCancellingSubscription,
    isApplyingTrial,
    earlyCancellationClientSecret,
    isReactivatingSubscription,
    earlyCancelSubscription,
    onEarlyCancellationConfirmed,
    cancelSubscription,
    activateTrial,
    reactivateUserSubscription,
  };
};
