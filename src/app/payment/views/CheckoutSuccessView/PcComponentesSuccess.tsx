import { trackPaymentConversion } from 'app/analytics/impact.service';
import localStorageService from 'app/core/services/local-storage.service';
import paymentService from 'app/payment/services/payment.service';
import { useAppDispatch } from 'app/store/hooks';
import { planThunks } from 'app/store/slices/plan';
import { userThunks } from 'app/store/slices/user';
import { useCallback, useEffect } from 'react';
import { removePaymentsStorage } from './CheckoutSuccessView';

const PcComponentesSuccess = () => {
  const dispatch = useAppDispatch();

  const onPcComponentesSuccess = useCallback(
    async ({
      customerId,
      priceId,
      token,
      websiteTokenParam,
      currency,
    }: {
      customerId: string;
      priceId: string;
      token: string;
      websiteTokenParam: string;
      currency: string;
    }) => {
      if (customerId && priceId && token && websiteTokenParam) {
        await paymentService.createSubscriptionWithTrial(customerId, priceId, token, websiteTokenParam, currency);
      }
      setTimeout(async () => {
        await dispatch(userThunks.initializeUserThunk());
        await dispatch(planThunks.initializeThunk());
      }, 3000);

      try {
        await trackPaymentConversion();
        removePaymentsStorage();
      } catch (err) {
        console.log('Analytics error: ', err);
      }
    },
    [dispatch],
  );

  useEffect(() => {
    const customerId = localStorageService.get('customerId');
    const token = localStorageService.get('customerToken');
    const currency = localStorageService.get('currency') ?? 'eur';
    const priceId = localStorageService.get('priceId');
    const websiteTokenParam = localStorageService.get('websiteToken');

    if (customerId && priceId && token && websiteTokenParam) {
      onPcComponentesSuccess({
        customerId,
        priceId,
        token,
        websiteTokenParam,
        currency,
      });
    }
  }, []);
  return <></>;
};

export default PcComponentesSuccess;
