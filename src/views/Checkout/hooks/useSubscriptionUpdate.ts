import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { useCallback } from 'react';

import { AppView } from 'app/core/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { useAppDispatch } from 'app/store/hooks';
import { planThunks } from 'app/store/slices/plan';
import errorService from 'services/error.service';
import navigationService from 'services/navigation.service';
import { paymentService } from '../services';
import { handleCheckoutError } from '../utils';

interface UseSubscriptionUpdateProps {
  selectedPlan?: PriceWithTax;
  promotionCode?: string | null;
  setIsUpdatingSubscription: (isUpdating: boolean) => void;
  setIsUpdateSubscriptionDialogOpen: (isOpen: boolean) => void;
}

export const useSubscriptionUpdate = ({
  selectedPlan,
  promotionCode,
  setIsUpdatingSubscription,
  setIsUpdateSubscriptionDialogOpen,
}: UseSubscriptionUpdateProps) => {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();

  const showSuccessSubscriptionNotification = useCallback(
    () => notificationsService.show({ text: 'Subscription updated successfully', type: ToastType.Success }),
    [translate],
  );

  const handlePaymentSuccess = () => {
    showSuccessSubscriptionNotification();
    dispatch(planThunks.initializeThunk()).unwrap();
  };

  const handleSubscriptionPayment = async () => {
    if (!selectedPlan?.price?.type) {
      console.error('No selected plan available for subscription payment');
      return;
    }

    try {
      await paymentService.updateSubscriptionWithConfirmation({
        priceId: selectedPlan.price.id,
        userType: selectedPlan.price.type,
        coupon: promotionCode ?? undefined,
        onSuccess: handlePaymentSuccess,
        onError: (error) => handleCheckoutError(error, translate('notificationMessages.errorCancelSubscription')),
      });
    } catch (err) {
      const error = errorService.castError(err);
      handleCheckoutError(error, translate('notificationMessages.errorCancelSubscription'));
    }
  };

  const onChangePlanClicked = async () => {
    setIsUpdatingSubscription(true);
    await handleSubscriptionPayment();
    setIsUpdateSubscriptionDialogOpen(false);
    setIsUpdatingSubscription(false);
    navigationService.push(AppView.Drive);
  };

  return {
    onChangePlanClicked,
  };
};
