import localStorageService from '../core/services/local-storage.service';
import { RootState } from '../store';
import { useAppSelector } from '../store/hooks';
import { PlanState } from '../store/slices/plan';
import { userSelectors } from '../store/slices/user';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

import FeaturesBanner from './FeaturesBanner';
import { getCookie, setCookie } from 'app/analytics/utils';

const SHOW_BANNER_COOKIE_NAME = 'show_banner';
const OFFER_END_DAY = new Date('2024-06-14');

const COOKIE_EXPIRE_DATE = OFFER_END_DAY.getDate() - new Date().getDate();

console.log('EXPIRE DATE: ', COOKIE_EXPIRE_DATE);

const BannerWrapper = (): JSX.Element => {
  const [showBanner, setShowBanner] = useState(false);
  const user = useSelector((state: RootState) => state.user.user) as UserSettings;
  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const isTutorialCompleted = localStorageService.hasCompletedTutorial(user.userId);
  const userPlan = plan.subscription?.type;

  const isNewUser = userPlan === 'free';
  const isNewAccount = useAppSelector(userSelectors.hasSignedToday);
  const isCookie = getCookie(SHOW_BANNER_COOKIE_NAME);
  const isOfferOffDay = new Date() > OFFER_END_DAY;

  const shouldShowBanner = isNewUser && !isCookie && !isOfferOffDay;

  useEffect(() => {
    handleBannerDisplay();
  }, [isTutorialCompleted, userPlan, isNewAccount]);

  const onCloseBanner = () => {
    setCookie(SHOW_BANNER_COOKIE_NAME, 'false', COOKIE_EXPIRE_DATE);
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
