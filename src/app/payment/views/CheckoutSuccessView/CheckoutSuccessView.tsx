import useEffectAsync from 'app/core/hooks/useEffectAsync';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import { useAppDispatch } from 'app/store/hooks';
import { planThunks } from 'app/store/slices/plan';
import { userThunks } from 'app/store/slices/user';
import { useCallback } from 'react';
import localStorageService from '../../../core/services/local-storage.service';
import { workspaceThunks } from 'app/store/slices/workspaces/workspacesStore';
import { trackPaymentConversion } from 'app/analytics/impact.service';
import gaService, { GA_SEND_TO_KEY } from 'app/analytics/ga.service';

function removePaymentsStorage() {
  localStorageService.removeItem('subscriptionId');
  localStorageService.removeItem('paymentIntentId');
  localStorageService.removeItem('amountPaid');
  localStorageService.removeItem('productName');
  localStorageService.removeItem('priceId');
  localStorageService.removeItem('currency');
}

const CheckoutSuccessView = (): JSX.Element => {
  const dispatch = useAppDispatch();

  const onCheckoutSuccess = useCallback(async () => {
    setTimeout(async () => {
      await dispatch(userThunks.initializeUserThunk());
      await dispatch(planThunks.initializeThunk());
      await dispatch(workspaceThunks.fetchWorkspaces());
    }, 3000);

    try {
      await trackPaymentConversion();
      removePaymentsStorage();
      gaService.track('conversion', {
        send_to: GA_SEND_TO_KEY,
        value: parseFloat(localStorageService.get('amountPaid') ?? '0'),
        currency: localStorageService.get('currency'),
        transaction_id: localStorageService.get('paymentIntentId'),
      });
    } catch (err) {
      console.log('Analytics error: ', err);
    }
    navigationService.push(AppView.Drive);
  }, [dispatch]);

  useEffectAsync(onCheckoutSuccess, []);

  return <div></div>;
};

export default CheckoutSuccessView;
