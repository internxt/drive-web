import { useCallback } from 'react';
import useEffectAsync from 'hooks/useEffectAsync';
import navigationService from 'services/navigation.service';
import { AppView } from 'app/core/types';

const CheckoutCancelView = (): JSX.Element => {
  const onCancelCheckout = useCallback(() => {
    navigationService.push(AppView.Drive);
  }, []);

  useEffectAsync(onCancelCheckout, []);

  return <div></div>;
};

export default CheckoutCancelView;
