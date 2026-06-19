import { useEffect } from 'react';

import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Sidenav } from '@internxt/ui';
import { HUNDRED_TB } from 'app/core/constants';
import { AppView } from 'app/core/types';
import { bytesToString } from 'app/drive/services/size.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { planSelectors } from 'app/store/slices/plan';
import { sharedThunks } from 'app/store/slices/sharedLinks';
import { uiActions } from 'app/store/slices/ui';
import logo from 'assets/icons/small-logo.svg';
import { useSidenavCollapsed } from 'hooks/useSidenavCollapsed';
import { useSidenavNavigation } from 'hooks/useSidenavNavigation';
import { useSuiteLauncher } from 'hooks/useSuiteLauncher';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import navigationService from 'services/navigation.service';
import referralService from 'services/referral.service';
import { parsePendingWorkspaces, parseWorkspaces } from 'utils/workspaces/parseWorkspaces.utils';
import { useReferralParamsChange } from 'views/Drive/hooks/useReferralParamsChange';
import WorkspaceSelectorContainer from 'views/Home/components/WorkspaceSelectorContainer';
import WorkspaceSelectorSkeleton from 'views/Home/components/WorkspaceSelectorSkeleton';
import ReferralBanner from './ReferralBanner';
import { CloudWarning } from '@phosphor-icons/react';

type StorageWarning = 'lowWarning' | 'midWarning' | 'highWarning';

interface StorageStageConfig {
  key: StorageWarning;
  threshold: number;
  barClassName: string;
  containerClassName?: string;
  advertisementKey?: string;
}

const STORAGE_STAGES: StorageStageConfig[] = [
  { key: 'lowWarning', threshold: 60, barClassName: 'bg-yellow-60', containerClassName: 'pb-5' },
  {
    key: 'midWarning',
    threshold: 80,
    barClassName: 'bg-orange-60',
    containerClassName: 'pb-5',
    advertisementKey: 'modals.reachingUsageBanner.midWarning.sidenavStorageText',
  },
  {
    key: 'highWarning',
    threshold: 95,
    barClassName: 'bg-danger',
    containerClassName: 'pb rounded-lg bg-alert border border-alert-dark',
    advertisementKey: 'modals.reachingUsageBanner.highWarning.sidenavStorageText',
  },
];

const SidenavPrimaryAction = ({
  user,
  isLoadingCredentials,
  isCollapsed,
}: {
  user?: UserSettings;
  isLoadingCredentials?: boolean;
  isCollapsed?: boolean;
}) => {
  if (user && !isLoadingCredentials) {
    return <WorkspaceSelectorContainer user={user} isCollapsed={isCollapsed} />;
  }
  return <WorkspaceSelectorSkeleton isCollapsed={isCollapsed} />;
};

const SidenavWrapper = () => {
  const { translate } = useTranslationContext();
  const { i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state: RootState) => state.user.user);
  const subscription = useAppSelector(planSelectors.subscriptionToShow);
  const planUsage = useAppSelector(planSelectors.planUsageToShow);
  const planLimit = useAppSelector(planSelectors.planLimitToShow);
  const isLoadingPlanLimit = useAppSelector((state: RootState) => state.plan.isLoadingPlanLimit);
  const isLoadingPlanUsage = useAppSelector((state: RootState) => state.plan.isLoadingPlanUsage);
  const isLoadingCredentials = useAppSelector((state: RootState) => state.workspaces.isLoadingCredentials);
  const isLoadingBusinessLimitAndUsage = useAppSelector(
    (state: RootState) => state.plan.isLoadingBusinessLimitAndUsage,
  );
  const workspaces = useSelector((state: RootState) => state.workspaces.workspaces);
  const selectedWorkspace = useSelector((state: RootState) => state.workspaces.selectedWorkspace);
  const pendingWorkspaces = useSelector((state: RootState) => state.workspaces.pendingWorkspaces);
  const parsedWorkspaces = parseWorkspaces(workspaces);
  const parsedPendingWorkspaces = parsePendingWorkspaces(pendingWorkspaces);
  const allParsedWorkspaces = [...parsedWorkspaces, ...parsedPendingWorkspaces];
  const isWorkspaceDropdownAvailable = allParsedWorkspaces.length > 0;
  const workspaceUuid = selectedWorkspace?.workspaceUser.workspaceId;
  const { itemsNavigation } = useSidenavNavigation();
  const { suiteArray } = useSuiteLauncher();
  const { isCollapsed, handleToggleCollapse } = useSidenavCollapsed();

  const userUsage = planUsage > 0 ? bytesToString(planUsage) : '0GB';
  const isReferralEligible = useAppSelector((state: RootState) => state.referrals.isEligible);

  const isFreeUser = subscription?.type === 'free';
  const usedPercentage = planLimit > 0 ? (planUsage / planLimit) * 100 : 0;
  const reachedStorageStage = isFreeUser
    ? [...STORAGE_STAGES].reverse().find((stage) => usedPercentage >= stage.threshold)
    : undefined;

  useReferralParamsChange();

  useEffect(() => {
    dispatch(sharedThunks.getPendingInvitations());
    referralService.trackAppOpenDay();
  }, []);

  useEffect(() => {
    referralService.changeLanguage(i18n.language);
  }, [i18n.language]);

  const onLogoClicked = () => {
    navigationService.push(AppView.Drive, {}, workspaceUuid);
  };

  const isUpgradeAvailable = () => {
    const isLifetimeAvailable = subscription?.type === 'lifetime' && planLimit < HUNDRED_TB;

    return subscription?.type === 'free' || isLifetimeAvailable;
  };

  const handleUpgradeClick = () => {
    window.open('https://internxt.com/specialoffer', '_blank', 'noopener,noreferrer');
  };

  const storageAdvertisement = reachedStorageStage?.advertisementKey ? (
    <span className="flex flex-row gap-0.5 items-center">
      <CloudWarning
        className="size-5 text-yellow-60"
        weight={reachedStorageStage.key === 'highWarning' ? 'fill' : 'regular'}
      />
      <p className="text-sm font-semibold text-gray-80">{translate(reachedStorageStage.advertisementKey)} </p>
    </span>
  ) : undefined;

  const handleReferralClick = () => {
    if (user) {
      referralService.openPanel(
        { name: user.name, lastname: user.lastname, email: user.email, emailVerified: user.emailVerified },
        i18n.language,
      );
    }
  };

  return (
    <div className="relative flex flex-col h-screen z-20">
      <Sidenav
        header={{
          logo: logo,
          title: translate('sideNav.drive'),
          onClick: onLogoClicked,
          className: `!pt-0 pb-3 ${isCollapsed ? 'justify-center' : ''}`,
        }}
        primaryAction={
          isWorkspaceDropdownAvailable ? (
            <SidenavPrimaryAction user={user} isLoadingCredentials={isLoadingCredentials} />
          ) : undefined
        }
        suiteLauncher={{
          suiteArray: suiteArray,
          soonText: translate('modals.upgradePlanDialog.soonBadge'),
        }}
        options={itemsNavigation}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        collapsedPrimaryAction={
          isWorkspaceDropdownAvailable ? (
            <SidenavPrimaryAction user={user} isLoadingCredentials={isLoadingCredentials} isCollapsed />
          ) : undefined
        }
        storage={{
          usage: userUsage,
          limit: bytesToString(planLimit),
          percentage: Math.min((planUsage / planLimit) * 100, 100),
          onUpgradeClick: handleUpgradeClick,
          upgradeLabel: isUpgradeAvailable() ? translate('preferences.account.plans.upgrade') : undefined,
          isLoading: isLoadingPlanUsage && isLoadingPlanLimit && isLoadingBusinessLimitAndUsage,
          barClassName: reachedStorageStage?.barClassName ?? 'bg-primary',
          containerClassName: reachedStorageStage?.containerClassName,
          advertisement: storageAdvertisement,
        }}
      />
      {isReferralEligible && (
        <div className="absolute bottom-24 left-0 right-0">
          <ReferralBanner onCtaClick={handleReferralClick} isCollapsed={isCollapsed} />
        </div>
      )}
    </div>
  );
};

export default SidenavWrapper;
