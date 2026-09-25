import useEffectAsync from 'hooks/useEffectAsync';
import navigationService from 'services/navigation.service';
import { AppView } from 'app/core/types';
import { useAppDispatch } from 'app/store/hooks';
import { useCallback, useRef } from 'react';
import localStorageService from 'services/local-storage.service';
import { trackPaymentConversion } from 'app/analytics/impact.service';
import gaService from 'app/analytics/ga.service';
import { PURCHASE_LOCAL_STORAGE_ITEMS } from 'services/storage-keys';
import metaService from 'app/analytics/meta.service';
import { userStoragePolling } from 'utils/userStoragePolling.utils';

export function removePaymentsStorage() {
  PURCHASE_LOCAL_STORAGE_ITEMS.forEach((item) => localStorageService.removeItem(item));
}

const CheckoutSuccessView = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const hasTrackedRef = useRef(false);

  const onCheckoutSuccess = useCallback(async () => {
    if (hasTrackedRef.current) {
      return;
    }

    hasTrackedRef.current = true;

    try {
      metaService.trackPurchase();
      await gaService.trackPurchase();
      await trackPaymentConversion();

      removePaymentsStorage();
    } catch (err) {
      console.error('Analytics error:', err);
    }

    userStoragePolling();

    navigationService.push(AppView.Drive);
  }, [dispatch]);

  useEffectAsync(onCheckoutSuccess, []);

  return <div></div>;
};

export default CheckoutSuccessView;
