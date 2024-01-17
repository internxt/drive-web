import localStorageService, { STORAGE_KEYS } from '../core/services/local-storage.service';
import { RootState } from '../store';
import { useAppSelector } from '../store/hooks';
import { PlanState } from '../store/slices/plan';
import { userSelectors } from '../store/slices/user';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import FeaturesBanner from './FeaturesBanner';

const SHOW_BANNER_COOKIE_NAME = 'show_data_privacy_banner';

const BannerWrapper = (): JSX.Element => {
  const [showBanner, setShowBanner] = useState(false);
  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const isTutorialCompleted = localStorageService.get(STORAGE_KEYS.SIGN_UP_TUTORIAL_COMPLETED);
  const userPlan = plan.subscription?.type;
  const isNewAccount = useAppSelector(userSelectors.hasSignedToday);
  const isLocalStorage = localStorageService.get(SHOW_BANNER_COOKIE_NAME);
  const shouldShowBanner = userPlan === 'free' && !isLocalStorage;

  useEffect(() => {
    handleBannerDisplay();
  }, [isTutorialCompleted, userPlan, isNewAccount]);

  const onCloseBanner = () => {
    localStorageService.set(SHOW_BANNER_COOKIE_NAME, 'false');
    setShowBanner(false);
  };

  function handleBannerDisplay() {
    if ((isNewAccount && isTutorialCompleted && shouldShowBanner) || (!isNewAccount && shouldShowBanner)) {
      setShowBanner(true);
    }
  }

  return <FeaturesBanner showBanner={showBanner} onClose={onCloseBanner} />;
};

export default BannerWrapper;
