import useEffectAsync from 'hooks/useEffectAsync';
import navigationService from 'services/navigation.service';
import { AppView } from 'app/core/types';
import { useAppDispatch } from 'app/store/hooks';
import { planThunks } from 'app/store/slices/plan';
import { userThunks } from 'app/store/slices/user';
import { useCallback } from 'react';
import localStorageService from 'services/local-storage.service';
import { workspaceThunks } from 'app/store/slices/workspaces/workspacesStore';
import { trackPaymentConversion } from 'app/analytics/impact.service';
import gaService from 'app/analytics/ga.service';

export function removePaymentsStorage() {
  localStorageService.removeItem('subscriptionId');
  localStorageService.removeItem('paymentIntentId');
  localStorageService.removeItem('amountPaid');
  localStorageService.removeItem('productName');
  localStorageService.removeItem('priceId');
  localStorageService.removeItem('customerId');
  localStorageService.removeItem('currency');
  localStorageService.removeItem('customerToken');
  localStorageService.removeItem('mobileToken');
  localStorageService.removeItem('couponCode');
  localStorageService.removeItem('checkout_item_data');
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
      await gaService.trackPurchase();
      await trackPaymentConversion();
      removePaymentsStorage();
    } catch (err) {
      console.log('Analytics error: ', err);
    }
    navigationService.push(AppView.Drive);
  }, [dispatch]);

  useEffectAsync(onCheckoutSuccess, []);

  return <div></div>;
};

export default CheckoutSuccessView;
