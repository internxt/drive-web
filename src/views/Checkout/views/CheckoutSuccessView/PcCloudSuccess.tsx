import { trackPaymentConversion } from 'app/analytics/impact.service';
import localStorageService from 'app/core/services/local-storage.service';
import paymentService from '../../../../views/Checkout/services/payment.service';
import { useAppDispatch } from 'app/store/hooks';
import { planThunks } from 'app/store/slices/plan';
import { userThunks } from 'app/store/slices/user';
import { useCallback, useEffect } from 'react';
import { removePaymentsStorage } from './CheckoutSuccessView';

const PcCloudSuccess = () => {
  const dispatch = useAppDispatch();

  const onPcCloudSuccess = useCallback(
    async ({
      customerId,
      priceId,
      token,
      mobileTokenParam,
      currency,
    }: {
      customerId: string;
      priceId: string;
      token: string;
      mobileTokenParam: string;
      currency: string;
    }) => {
      if (customerId && priceId && token && mobileTokenParam) {
        await paymentService.createSubscriptionWithTrial(customerId, priceId, token, mobileTokenParam, currency);
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
      const deepLinkUrl = 'com.internxt.pccloud://checkout';
      window.location.href = deepLinkUrl;
    },
    [dispatch],
  );

  useEffect(() => {
    const customerId = localStorageService.get('customerId');
    const token = localStorageService.get('customerToken');
    const currency = localStorageService.get('currency') ?? 'eur';
    const priceId = localStorageService.get('priceId');
    const mobileTokenParam = localStorageService.get('mobileToken');

    if (customerId && priceId && token && mobileTokenParam) {
      onPcCloudSuccess({
        customerId,
        priceId,
        token,
        mobileTokenParam,
        currency,
      });
    }
  }, []);
  return <></>;
};

export default PcCloudSuccess;
