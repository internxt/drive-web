import { connect } from 'react-redux';
import { useEffect, useState } from 'react';

import { RootState } from 'app/store';
import { planSelectors } from 'app/store/slices/plan';
import navigationService from 'services/navigation.service';
import { AppView } from 'app/core/types';
import { UserSubscription } from '@internxt/sdk/dist/drive/payments/types/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Sidenav } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import { HUNDRED_TB } from 'app/core/constants';
import { sharedThunks } from 'app/store/slices/sharedLinks';
import logo from 'assets/icons/small-logo.svg';
import { bytesToString } from 'app/drive/services/size.service';
import WorkspaceSelectorContainer from 'views/Home/components/WorkspaceSelectorContainer';
import WorkspaceSelectorSkeleton from 'views/Home/components/WorkspaceSelectorSkeleton';
import { useSuiteLauncher } from 'hooks/useSuiteLauncher';
import { useSidenavNavigation } from 'hooks/useSidenavNavigation';
import { uiActions } from 'app/store/slices/ui';
import ReferralBanner from './ReferralBanner';
import referralService from 'services/referral.service';
import i18next from 'i18next';

interface SidenavWrapperProps {
  user: UserSettings | undefined;
  subscription: UserSubscription | null;
  planUsage: number;
  planLimit: number;
  isLoadingPlanLimit: boolean;
  isLoadingPlanUsage: boolean;
}

const SidenavWrapper = ({
  user,
  subscription,
  planUsage,
  planLimit,
  isLoadingPlanLimit,
  isLoadingPlanUsage,
}: SidenavWrapperProps) => {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const isLoadingCredentials = useAppSelector((state: RootState) => state.workspaces.isLoadingCredentials);
  const isLoadingBusinessLimitAndUsage = useAppSelector(
    (state: RootState) => state.plan.isLoadingBusinessLimitAndUsage,
  );
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const workspaceUuid = selectedWorkspace?.workspaceUser.workspaceId;
  const { itemsNavigation } = useSidenavNavigation();
  const { suiteArray } = useSuiteLauncher();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const savedState = sessionStorage.getItem('sidenav-collapsed');
    return savedState === 'true';
  });

  useEffect(() => {
    dispatch(sharedThunks.getPendingInvitations());
    referralService.trackAppOpenDay();
  }, []);

  useEffect(() => {
    if (user) {
      referralService.boot({ name: user.name, lastname: user.lastname, email: user.email }, i18next.language);
    }
  }, [user]);

  const onLogoClicked = () => {
    navigationService.push(AppView.Drive, {}, workspaceUuid);
  };

  const isUpgradeAvailable = () => {
    const isLifetimeAvailable = subscription?.type === 'lifetime' && planLimit < HUNDRED_TB;

    return subscription?.type === 'free' || isLifetimeAvailable;
  };

  const handleUpgradeClick = () => {
    navigationService.openPreferencesDialog({
      section: 'account',
      subsection: 'plans',
      workspaceUuid: selectedWorkspace?.workspaceUser.workspaceId,
    });
    dispatch(uiActions.setIsPreferencesDialogOpen(true));
  };

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const newValue = !prev;
      sessionStorage.setItem('sidenav-collapsed', String(newValue));
      return newValue;
    });
  };

  const handleReferralClick = () => {
    if (user) {
      referralService.openPanel({ name: user.name, lastname: user.lastname, email: user.email }, i18next.language);
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
          user && !isLoadingCredentials ? <WorkspaceSelectorContainer user={user} /> : <WorkspaceSelectorSkeleton />
        }
        suiteLauncher={{
          suiteArray: suiteArray,
          soonText: translate('modals.upgradePlanDialog.soonBadge'),
        }}
        options={itemsNavigation}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        collapsedPrimaryAction={
          user && !isLoadingCredentials ? (
            <WorkspaceSelectorContainer user={user} isCollapsed />
          ) : (
            <WorkspaceSelectorSkeleton isCollapsed />
          )
        }
        storage={{
          usage: bytesToString(planUsage),
          limit: bytesToString(planLimit),
          percentage: Math.min((planUsage / planLimit) * 100, 100),
          onUpgradeClick: handleUpgradeClick,
          upgradeLabel: isUpgradeAvailable() ? translate('preferences.account.plans.upgrade') : undefined,
          isLoading: isLoadingPlanUsage && isLoadingPlanLimit && isLoadingBusinessLimitAndUsage,
        }}
      />
      <div className="absolute bottom-24 left-0 right-0">
        <ReferralBanner onCtaClick={handleReferralClick} isCollapsed={isCollapsed} />
      </div>
    </div>
  );
};

export default connect((state: RootState) => ({
  user: state.user.user,
  subscription: planSelectors.subscriptionToShow(state),
  planUsage: planSelectors.planUsageToShow(state),
  planLimit: planSelectors.planLimitToShow(state),
  isLoadingPlanLimit: state.plan.isLoadingPlanLimit,
  isLoadingPlanUsage: state.plan.isLoadingPlanUsage,
}))(SidenavWrapper);
