import { RootState } from '../store';
import { PlanState } from '../store/slices/plan';
import { useSelector } from 'react-redux';

import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

import FeaturesBanner from './FeaturesBanner';
import { BannerManager } from './BannerManager';
import { useEffect, useMemo, useState } from 'react';
import SubscriptionBanner from './SubscriptionBanner';
import { userSelectors } from 'app/store/slices/user';

const OFFER_END_DAY = new Date('2025-05-26');

const BannerWrapper = (): JSX.Element => {
  const user = useSelector((state: RootState) => state.user.user) as UserSettings;
  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const isNewAccount = useSelector((state: RootState) => userSelectors.hasSignedToday(state));

  const bannerManager = useMemo(() => new BannerManager(user, plan, OFFER_END_DAY), [user, plan, isNewAccount]);

  const [bannersToShow, setBannersToShow] = useState({
    showFreeBanner: false,
    showSubscriptionBanner: false,
  });

  const bannerKeyMap: Record<keyof typeof bannersToShow, string> = {
    showFreeBanner: 'show_free_users_banner',
    showSubscriptionBanner: 'show_banner',
  };

  useEffect(() => {
    const newBanners = bannerManager.getBannersToShow();
    setBannersToShow(() => ({
      showFreeBanner: newBanners.showFreeBanner,
      showSubscriptionBanner: newBanners.showSubscriptionBanner,
    }));
  }, [bannerManager]);

  const onCloseBanner = (bannerKey: keyof typeof bannersToShow) => {
    const localStorageKey = bannerKeyMap[bannerKey];
    bannerManager.onCloseBannerByKey(localStorageKey);
    setBannersToShow((prev) => ({ ...prev, [bannerKey]: false }));
  };

  return (
    <>
      {bannersToShow.showFreeBanner && <FeaturesBanner showBanner onClose={() => onCloseBanner('showFreeBanner')} />}
      {bannersToShow.showSubscriptionBanner && (
        <SubscriptionBanner
          showBanner
          onClose={() => onCloseBanner('showSubscriptionBanner')}
          isLifetimeUser={plan.individualSubscription?.type === 'lifetime'}
        />
      )}
    </>
  );
};

export default BannerWrapper;
