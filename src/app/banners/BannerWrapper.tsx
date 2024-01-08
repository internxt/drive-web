import localStorageService, { STORAGE_KEYS } from 'app/core/services/local-storage.service';
import { RootState } from 'app/store';
import { useAppSelector } from 'app/store/hooks';
import { PlanState } from 'app/store/slices/plan';
import { userSelectors } from 'app/store/slices/user';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import BlackFridayBanner from './BlackFridayBanner';
import { getCookie, setCookie } from 'app/analytics/utils';

const SHOW_BANNER_COOKIE_NAME = 'showBanner';

const BannerWrapper = (): JSX.Element => {
  const [showBanner, setShowBanner] = useState(false);
  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const isTutorialCompleted = localStorageService.get(STORAGE_KEYS.SIGN_UP_TUTORIAL_COMPLETED);
  const userPlan = plan.subscription?.type;
  const isNewAccount = useAppSelector(userSelectors.hasSignedToday);
  const shouldShowBanner = userPlan === 'free' && !getCookie(SHOW_BANNER_COOKIE_NAME);
  const expireDate = new Date('2024-01-01');
  const today = new Date();

  const daysLeft = Math.floor((expireDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

  const onCloseBanner = () => {
    setCookie(SHOW_BANNER_COOKIE_NAME, 'false', daysLeft);
    setShowBanner(false);
  };

  function handleBannerDisplay() {
    if ((isNewAccount && isTutorialCompleted && shouldShowBanner) || (!isNewAccount && shouldShowBanner)) {
      setShowBanner(true);
    }
  }

  useEffect(() => {
    handleBannerDisplay();
  }, [isTutorialCompleted, userPlan, isNewAccount]);

  return <BlackFridayBanner showBanner={showBanner} onClose={onCloseBanner} />;
};

export default BannerWrapper;
