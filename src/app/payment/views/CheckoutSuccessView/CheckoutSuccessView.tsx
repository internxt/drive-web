import { useAppDispatch } from 'app/store/hooks';
import useEffectAsync from 'app/core/hooks/useEffectAsync';
import { userThunks } from 'app/store/slices/user';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import analyticsService from 'app/analytics/services/analytics.service';
import { useCallback } from 'react';

const CheckoutSuccessView = (): JSX.Element => {
  const dispatch = useAppDispatch();

  const onCheckoutSuccess = useCallback(async () => {
    await dispatch(userThunks.refreshUserThunk());
    try {
      await analyticsService.trackPaymentConversion();
    } catch (err) {
      console.log('Analytics error: ', err);
    }
    navigationService.push(AppView.Drive);
  }, [dispatch]);

  useEffectAsync(onCheckoutSuccess, []);

  return <div></div>;
};

export default CheckoutSuccessView;
