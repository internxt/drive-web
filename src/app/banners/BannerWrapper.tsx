import { RootState } from '../store';
import { PlanState } from '../store/slices/plan';
import { useSelector } from 'react-redux';

import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { BannerManager } from './BannerManager';
import { useEffect, useMemo, useState } from 'react';
import { userSelectors } from 'app/store/slices/user';
import FeaturesBanner from './FeaturesBanner';

const OFFER_END_DAY = new Date('2026-01-06');
const TIMEOUT = 8000;

const BannerWrapper = (): JSX.Element => {
  const user = useSelector((state: RootState) => state.user.user) as UserSettings;
  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const isNewAccount = useSelector((state: RootState) => userSelectors.hasSignedToday(state));

  const bannerManager = useMemo(() => new BannerManager(user, plan, OFFER_END_DAY), [user, plan, isNewAccount]);

  const [bannersToShow, setBannersToShow] = useState({ showFreeBanner: false, showSubscriptionBanner: false });
  const [showDelayedBanner, setShowDelayedBanner] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setShowDelayedBanner(true), TIMEOUT);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const newBanners = bannerManager.getBannersToShow();
    setBannersToShow(() => ({
      showFreeBanner: newBanners.showFreeBanner,
      showSubscriptionBanner: newBanners.showSubscriptionBanner,
    }));
  }, [bannerManager]);

  const onCloseBanner = (bannerKey: keyof typeof bannersToShow) => {
    bannerManager.onCloseBanner();
    setBannersToShow((prev) => ({ ...prev, [bannerKey]: false }));
  };

  return (
    <>
      {bannersToShow.showFreeBanner && showDelayedBanner && (
        <FeaturesBanner onClose={() => onCloseBanner('showFreeBanner')} showBanner />
      )}
    </>
  );
};

export default BannerWrapper;
