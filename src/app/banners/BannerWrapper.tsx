import { RootState } from '../store';
import { PlanState } from '../store/slices/plan';
import { useSelector } from 'react-redux';

import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

import FeaturesBanner from './FeaturesBanner';
import { BannerManager } from './BannerManager';
import { useEffect, useMemo, useState } from 'react';
import SubscriptionBanner from './SubscriptionBanner';
import { userSelectors } from 'app/store/slices/user';

const OFFER_END_DAY = new Date('2025-03-17');

const BannerWrapper = (): JSX.Element => {
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [showSubscriptionBanner, setShowSubscriptionBanner] = useState<boolean>(false);
  const user = useSelector((state: RootState) => state.user.user) as UserSettings;
  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const isNewAccount = useSelector((state: RootState) => userSelectors.hasSignedToday(state));

  const bannerManager = useMemo(
    () => new BannerManager(user, plan, OFFER_END_DAY, isNewAccount),
    [user, plan, isNewAccount],
  );

  useEffect(() => {
    bannerManager.handleBannerDisplay('free', setShowBanner);
    bannerManager.handleBannerDisplay('subscription', setShowSubscriptionBanner);
  }, [bannerManager]);

  const onCloseBanner = () => bannerManager.onCloseBanner(setShowBanner);
  const onCloseSubscriptionBanner = () => bannerManager.onCloseBanner(setShowSubscriptionBanner);

  return (
    <>
      {showBanner && <FeaturesBanner showBanner={showBanner} onClose={onCloseBanner} />}
      {showSubscriptionBanner && (
        <SubscriptionBanner
          showBanner={showSubscriptionBanner}
          onClose={onCloseSubscriptionBanner}
          isLifetimeUser={plan.individualSubscription?.type === 'lifetime'}
        />
      )}
    </>
  );
};

export default BannerWrapper;
