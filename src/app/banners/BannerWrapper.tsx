import localStorageService, { STORAGE_KEYS } from 'app/core/services/local-storage.service';
import { RootState } from 'app/store';
import { useAppSelector } from 'app/store/hooks';
import { PlanState } from 'app/store/slices/plan';
import { userSelectors } from 'app/store/slices/user';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Banner from './Banner';

const BannerWrapper = (): JSX.Element => {
  const [showBanner, setShowBanner] = useState(false);
  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const isTutorialCompleted = localStorageService.get(STORAGE_KEYS.SIGN_UP_TUTORIAL_COMPLETED);
  const userPlan = plan.subscription?.type;
  const isNewAccount = useAppSelector(userSelectors.hasSignedToday);
  const shouldShowBanner = userPlan === 'free' && !localStorageService.get(STORAGE_KEYS.SHOW_LIFETIME_BANNER);

  const onCloseBanner = () => {
    setShowBanner(false);
    localStorage.setItem(STORAGE_KEYS.SHOW_LIFETIME_BANNER, 'false');
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
