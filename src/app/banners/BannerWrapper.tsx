import { RootState } from '../store';
import { PlanState } from '../store/slices/plan';
import { useSelector } from 'react-redux';

import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

import FeaturesBanner from './FeaturesBanner';
import { BannerManager } from './BannerManager';
import { useEffect, useState } from 'react';

const EXPIRATION_DATE_NAME = 'expiration_banner_date';
const OFFER_END_DAY = new Date('2024-07-14');

const BannerWrapper = (): JSX.Element => {
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const user = useSelector((state: RootState) => state.user.user) as UserSettings;
  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const bannerManager = new BannerManager(user, plan);

  useEffect(() => {
    bannerManager.handleBannerDisplay(setShowBanner);
  }, [user, plan]);

  const onCloseBanner = () => bannerManager.onCloseBanner(setShowBanner);

  return <FeaturesBanner showBanner={showBanner} onClose={onCloseBanner} />;
};

export default BannerWrapper;
