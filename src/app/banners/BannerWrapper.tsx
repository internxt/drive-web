import localStorageService, { STORAGE_KEYS } from '../core/services/local-storage.service';
import { RootState } from '../store';
import { useAppSelector } from '../store/hooks';
import { PlanState } from '../store/slices/plan';
import { userSelectors } from '../store/slices/user';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Banner from './Banner';

const SHOW_BANNER_COOKIE_NAME = 'show_soft_banner_sale';
const OFFER_OFF_DAY = new Date('2024-02-12');

const BannerWrapper = (): JSX.Element => {
  const [showBanner, setShowBanner] = useState(false);
  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const isTutorialCompleted = localStorageService.get(STORAGE_KEYS.SIGN_UP_TUTORIAL_COMPLETED);
  const userPlan = plan.subscription?.type;
  const isNewAccount = useAppSelector(userSelectors.hasSignedToday);
  const isLocalStorage = localStorageService.get(SHOW_BANNER_COOKIE_NAME);
  const isOfferOffDay = new Date() > OFFER_OFF_DAY;

  const shouldShowBanner = userPlan === 'free' && !isLocalStorage && !isOfferOffDay;

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

  return <Banner showBanner={showBanner} onClose={onCloseBanner} />;
};

export default BannerWrapper;
