import { useAppDispatch } from 'app/store/hooks';
import useEffectAsync from 'app/core/hooks/useEffectAsync';
import { userThunks } from 'app/store/slices/user';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
//import analyticsService from 'app/analytics/services/analytics.service';

const CheckoutSuccessView = (): JSX.Element => {
  const dispatch = useAppDispatch();

  useEffectAsync(async () => {
    await dispatch(userThunks.refreshUserThunk());
    //analyticsService.trackPaymentConversion();
    navigationService.push(AppView.Drive);
  }, []);

  return <div></div>;
};

export default CheckoutSuccessView;
