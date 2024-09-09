import analyticsService from 'app/analytics/services/analytics.service';
import useEffectAsync from 'app/core/hooks/useEffectAsync';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import { useAppDispatch } from 'app/store/hooks';
import { planThunks } from 'app/store/slices/plan';
import { userThunks } from 'app/store/slices/user';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import localStorageService from '../../../core/services/local-storage.service';
import { RootState } from '../../../store';
import { useThemeContext } from '../../../theme/ThemeProvider';
import { isStarWarsThemeAvailable } from '../../utils/checkStarWarsCode';
import { workspaceThunks } from 'app/store/slices/workspaces/workspacesStore';

const CheckoutSuccessView = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const { toggleTheme } = useThemeContext();
  const plan = useSelector((state: RootState) => state.plan);

  const onCheckoutSuccess = useCallback(async () => {
    setTimeout(async () => {
      await dispatch(userThunks.initializeUserThunk());
      await dispatch(planThunks.initializeThunk());
      dispatch(workspaceThunks.fetchWorkspaces());
    }, 3000);

    try {
      await analyticsService.trackPaymentConversion();
      localStorageService.removeItem('subscriptionId');
      localStorageService.removeItem('paymentIntentId');
      localStorageService.removeItem('amountPaid');
    } catch (err) {
      console.log('Analytics error: ', err);
    }
    isStarWarsThemeAvailable(plan, () => toggleTheme('starwars'));
    navigationService.push(AppView.Drive);
  }, [dispatch]);

  useEffectAsync(onCheckoutSuccess, []);

  return <div></div>;
};

export default CheckoutSuccessView;
