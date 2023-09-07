import localStorageService, { STORAGE_KEYS } from 'app/core/services/local-storage.service';
import { RootState } from 'app/store';
import { useAppSelector } from 'app/store/hooks';
import { PlanState } from 'app/store/slices/plan';
import { userSelectors } from 'app/store/slices/user';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import CrowdcubeBanner from './CrowdcubeBanner';

const BannerWrapper = (): JSX.Element => {
  const [showBanner, setShowBanner] = useState(true);
  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const isTutorialCompleted = localStorageService.get(STORAGE_KEYS.SIGN_UP_TUTORIAL_COMPLETED);
  const userPlan = plan.subscription?.type;
  const isNewAccount = useAppSelector(userSelectors.hasSignedToday);
  // const shouldShowBanner = userPlan === 'free' && !localStorageService.get(STORAGE_KEYS.SHOW_LIFETIME_BANNER);

  const onCloseBanner = () => {
    setShowBanner(false);
  };

  // function handleBannerDisplay() {
  //   if ((isNewAccount && isTutorialCompleted) || !isNewAccount) {
  //     setShowBanner(true);
  //   }
  // }

  // useEffect(() => {
  //   handleBannerDisplay();
  // }, [isTutorialCompleted, userPlan, isNewAccount]);

  return <CrowdcubeBanner onCloseBanner={onCloseBanner} showBanner={showBanner} />;
};

export default BannerWrapper;
