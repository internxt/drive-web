import useEffectAsync from '../../../core/hooks/useEffectAsync';
import navigationService from '../../../core/services/navigation.service';
import { AppView } from '../../../core/types';
import { useAppDispatch } from '../../../store/hooks';
import { planThunks } from '../../../store/slices/plan';
import { userThunks } from '../../../store/slices/user';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import localStorageService from '../../../core/services/local-storage.service';
import { RootState } from '../../../store';
import { useThemeContext } from '../../../theme/ThemeProvider';
import { isStarWarsThemeAvailable } from '../../utils/checkStarWarsCode';
import { workspaceThunks } from '../../../store/slices/workspaces/workspacesStore';
import { trackPaymentConversion } from '../../../analytics/impact.service';

const CheckoutSuccessView = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const { toggleTheme } = useThemeContext();
  const plan = useSelector((state: RootState) => state.plan);

  const onCheckoutSuccess = useCallback(async () => {
    setTimeout(async () => {
      await dispatch(userThunks.initializeUserThunk());
      await dispatch(planThunks.initializeThunk());
      await dispatch(workspaceThunks.fetchWorkspaces());
    }, 3000);

    try {
      await trackPaymentConversion();
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
