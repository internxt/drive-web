import localStorageService from '../core/services/local-storage.service';
import { RootState } from '../store';
import { useAppSelector } from '../store/hooks';
import { PlanState } from '../store/slices/plan';
import { userSelectors } from '../store/slices/user';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

import FeaturesBanner from './FeaturesBanner';

const SHOW_BANNER_NAME = 'show_banner';
const EXPIRATION_DATE_NAME = 'expiration_banner_date';
const OFFER_END_DAY = new Date('2024-07-14');

const BannerWrapper = (): JSX.Element => {
  const [showBanner, setShowBanner] = useState(false);
  const user = useSelector((state: RootState) => state.user.user) as UserSettings;
  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const isTutorialCompleted = localStorageService.hasCompletedTutorial(user.userId);
  const userPlan = plan.subscription?.type;

  const expirationBannerInLocalStorage = localStorageService.get(EXPIRATION_DATE_NAME);
  const nameBannerInLocalStorage = localStorageService.get(SHOW_BANNER_NAME);

  const isNewUser = userPlan === 'free';
  const isNewAccount = useAppSelector(userSelectors.hasSignedToday);
  const isOfferOffDay = new Date() > OFFER_END_DAY;
  const shouldRemoveLocalStorageItems =
    new Date().toISOString() > JSON.parse(expirationBannerInLocalStorage as string) || isOfferOffDay;

  const showBannerIfLocalStorageExists = !nameBannerInLocalStorage && !expirationBannerInLocalStorage;

  const shouldShowBanner = isNewUser && showBannerIfLocalStorageExists && !isOfferOffDay;

  useEffect(() => {
    handleBannerDisplay();
    if (shouldRemoveLocalStorageItems) {
      localStorageService.removeItem(SHOW_BANNER_NAME);
      localStorageService.removeItem(EXPIRATION_DATE_NAME);
    }
  }, [isTutorialCompleted, userPlan, isNewAccount]);

  const onCloseBanner = () => {
    localStorageService.set(SHOW_BANNER_NAME, 'false');
    localStorageService.set(EXPIRATION_DATE_NAME, JSON.stringify(OFFER_END_DAY));
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
