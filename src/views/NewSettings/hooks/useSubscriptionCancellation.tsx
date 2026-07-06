import { t } from 'i18next';
import { useState } from 'react';
import { UserSubscription, UserType } from '@internxt/sdk/dist/drive/payments/types/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import longNotificationsService from 'app/notifications/services/longNotification.service';
import { paymentService } from 'views/Checkout/services';
import { useAppDispatch } from 'app/store/hooks';
import { planThunks } from 'app/store/slices/plan';
import { errorService } from 'services';

interface UseSubscriptionCancellationOptions {
  individualSubscription?: UserSubscription | null;
  onModalClose?: () => void;
  onCancelSuccess?: () => void;
}

interface UseSubscriptionCancellationResult {
  cancellingSubscription: boolean;
  applyingTrial: boolean;
  cancelSubscription: (userType?: UserType) => Promise<void>;
  activateTrial: () => Promise<void>;
}

const REFRESH_PLAN_DELAY_MS = 1000;

/**
 * Encapsulates the subscription cancellation and cancellation-trial (retention incentive) logic
 * so it can be reused across the account and workspace billing sections.
 */
export const useSubscriptionCancellation = ({
  individualSubscription,
  onModalClose,
  onCancelSuccess,
}: UseSubscriptionCancellationOptions): UseSubscriptionCancellationResult => {
  const dispatch = useAppDispatch();
  const [cancellingSubscription, setCancellingSubscription] = useState<boolean>(false);
  const [applyingTrial, setApplyingTrial] = useState<boolean>(false);

  const refreshPlan = () => {
    setTimeout(() => {
      dispatch(planThunks.initializeThunk()).unwrap();
    }, REFRESH_PLAN_DELAY_MS);
  };

  const cancelSubscription = async (userType?: UserType) => {
    setCancellingSubscription(true);
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
      setCancellingSubscription(false);
      refreshPlan();
      onCancelSuccess?.();
    }
  };

  const activateTrial = async () => {
    if (individualSubscription?.type !== 'subscription') return;

    setApplyingTrial(true);
    try {
      await paymentService.applyCancellationTrial(individualSubscription.subscriptionId);
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
      setApplyingTrial(false);
      refreshPlan();
    }
  };

  return { cancellingSubscription, applyingTrial, cancelSubscription, activateTrial };
};
