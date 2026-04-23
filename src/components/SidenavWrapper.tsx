import { useEffect } from 'react';

import { RootState } from 'app/store';
import { planSelectors } from 'app/store/slices/plan';
import navigationService from 'services/navigation.service';
import { AppView } from 'app/core/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Sidenav } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useTranslation } from 'react-i18next';
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
import { useSidenavCollapsed } from 'hooks/useSidenavCollapsed';

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
  const workspaces = useAppSelector((state: RootState) => state.workspaces.workspaces);
  const isWorkspaceDropdownAvailable = workspaces.length > 0;
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const workspaceUuid = selectedWorkspace?.workspaceUser.workspaceId;
  const { itemsNavigation } = useSidenavNavigation();
  const { suiteArray } = useSuiteLauncher();
  const { isCollapsed, handleToggleCollapse } = useSidenavCollapsed();

  const userUsage = planUsage > 0 ? bytesToString(planUsage) : '0GB';
  const isReferralEligible = useAppSelector((state: RootState) => state.referrals.isEligible);

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
    navigationService.openPreferencesDialog({
      section: 'account',
      subsection: 'plans',
      workspaceUuid: selectedWorkspace?.workspaceUser.workspaceId,
    });
    dispatch(uiActions.setIsPreferencesDialogOpen(true));
  };

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
