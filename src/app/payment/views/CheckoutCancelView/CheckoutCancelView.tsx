import { useCallback } from 'react';
import useEffectAsync from 'app/core/hooks/useEffectAsync';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';

const CheckoutCancelView = (): JSX.Element => {
  const URLParams = new URLSearchParams(window.location.search);
  const priceId = String(URLParams.get('price_id'));

  const onCancelCheckout = useCallback(async () => {
    navigationService.push(AppView.Drive);
  }, []);

  useEffectAsync(onCancelCheckout, []);

  return <div></div>;
};

export default CheckoutCancelView;
