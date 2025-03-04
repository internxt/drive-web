import { RootState } from '../store';
import { PlanState } from '../store/slices/plan';
import { useSelector } from 'react-redux';

import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

import FeaturesBanner from './FeaturesBanner';
import SubscriptionBanner from './SubscriptionBanner';
import LifetimeBanners from './LifetimeBanners';
import { BannerManager } from './BannerManager';
import { useEffect, useMemo, useState } from 'react';

const OFFER_END_DAY = new Date('2025-03-17');

const BannerWrapper = (): JSX.Element => {
  const [showBanners, setShowBanners] = useState({
    features: false,
    subscriptions: false,
    lifetimes: true,
  });

  const user = useSelector((state: RootState) => state.user.user) as UserSettings;
  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const bannerManager = useMemo(() => new BannerManager(user, plan, OFFER_END_DAY), [user, plan]);

  useEffect(() => {
    const banners = {
      features: 'free',
      subscriptions: 'subscription',
      lifetimes: 'lifetime',
    };

    Object.entries(banners).forEach(([key, type]) => {
      bannerManager.handleBannerDisplayByType(type as 'free' | 'subscription' | 'lifetime', (show) => {
        setShowBanners((prev) => ({ ...prev, [key]: show }));
      });
    });
  }, [user, plan]);

  const onCloseBanner = (key: keyof typeof showBanners) => {
    bannerManager.onCloseBanner((show) => {
      setShowBanners((prev) => ({ ...prev, [key]: show }));
    });
  };

  return (
    <>
      <FeaturesBanner showBanner={showBanners.features} onClose={() => onCloseBanner('features')} />
      <SubscriptionBanner showBanner={showBanners.subscriptions} onClose={() => onCloseBanner('subscriptions')} />
      <LifetimeBanners showBanner={showBanners.lifetimes} onClose={() => onCloseBanner('lifetimes')} />
    </>
  );
};

export default BannerWrapper;
