import useEffectAsync from 'app/core/hooks/useEffectAsync';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import analyticsService from 'app/analytics/services/analytics.service';
import { useCallback } from 'react';

const CheckoutCancelView = (): JSX.Element => {
  const onCancelCheckout = useCallback(async () => {
    try {
      await analyticsService.trackCancelPayment();
    } catch (err) {
      console.log('Analytics error: ', err);
    }
    navigationService.push(AppView.Drive);
  }, []);

  useEffectAsync(onCancelCheckout, []);

  return <div></div>;
};

export default CheckoutCancelView;
