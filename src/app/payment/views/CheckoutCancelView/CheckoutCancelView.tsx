import useEffectAsync from '../../../core/hooks/useEffectAsync';
import navigationService from '../../../core/services/navigation.service';
import { AppView } from '../../../core/types';
import analyticsService from '../../../analytics/services/analytics.service';
import { useCallback } from 'react';

const CheckoutCancelView = (): JSX.Element => {
  const URLParams = new URLSearchParams(window.location.search);
  const priceId = String(URLParams.get('price_id'));

  const onCancelCheckout = useCallback(async () => {
    try {
      await analyticsService.trackCancelPayment(priceId);
    } catch (err) {
      console.log('Analytics error: ', err);
    }
    navigationService.push(AppView.Drive);
  }, []);

  useEffectAsync(onCancelCheckout, []);

  return <div></div>;
};

export default CheckoutCancelView;
