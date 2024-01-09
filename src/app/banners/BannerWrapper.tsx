import localStorageService, { STORAGE_KEYS } from '../core/services/local-storage.service';
import { RootState } from '../store';
import { useAppSelector } from '../store/hooks';
import { PlanState } from '../store/slices/plan';
import { userSelectors } from '../store/slices/user';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Banner from './Banner';

const SHOW_BANNER_COOKIE_NAME = 'show_lifetime_banner';

const BannerWrapper = (): JSX.Element => {
  const [showBanner, setShowBanner] = useState(false);
  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const isTutorialCompleted = localStorageService.get(STORAGE_KEYS.SIGN_UP_TUTORIAL_COMPLETED);
  const userPlan = plan.subscription?.type;
  const isNewAccount = useAppSelector(userSelectors.hasSignedToday);
  const isLocalStorage = localStorageService.get(SHOW_BANNER_COOKIE_NAME);
  const shouldShowBanner = userPlan === 'free' && !isLocalStorage;
  const expireDate = new Date('2024-01-10T23:59:59.000Z');
  const today = new Date();

  const daysLeft = Math.floor((expireDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

  const onCloseBanner = () => {
    localStorageService.set(SHOW_BANNER_COOKIE_NAME, 'false');
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

  return <Banner showBanner={showBanner} onClose={onCloseBanner} />;
};

export default BannerWrapper;
