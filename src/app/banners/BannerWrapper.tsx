import { RootState } from '../store';
import { PlanState } from '../store/slices/plan';
import { useSelector } from 'react-redux';

import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

import FeaturesBanner from './FeaturesBanner';
import { BannerManager } from './BannerManager';
import { useEffect, useState } from 'react';

const OFFER_END_DAY = new Date('2025-02-25');

const BannerWrapper = (): JSX.Element => {
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const user = useSelector((state: RootState) => state.user.user) as UserSettings;
  const plan = useSelector<RootState, PlanState>((state) => state.plan);

  const bannerManager = new BannerManager(user, plan, OFFER_END_DAY);

  useEffect(() => {
    bannerManager.handleBannerDisplay(setShowBanner);
  }, [user, plan]);

  const onCloseBanner = () => bannerManager.onCloseBanner(setShowBanner);

  return <>{showBanner && <FeaturesBanner showBanner={showBanner} onClose={onCloseBanner} />}</>;
};

export default BannerWrapper;
