import { Clock, ClockCounterClockwise, Desktop, FolderSimple, Trash, Users } from '@phosphor-icons/react';
import { connect, useSelector } from 'react-redux';
import { matchPath } from 'react-router-dom';

import desktopService from 'app/core/services/desktop.service';
import PlanUsage from 'app/drive/components/PlanUsage/PlanUsage';
import navigationService from '../../services/navigation.service';
import { RootState } from 'app/store';
import { planSelectors } from 'app/store/slices/plan';
import { AppView } from '../../types';

import SidenavItem from './SidenavItem/SidenavItem';
import { ReactComponent as InternxtLogo } from 'assets/icons/big-logo.svg';
import Spinner from 'app/shared/components/Spinner/Spinner';
import ReferralsWidget from 'app/referrals/components/ReferralsWidget/ReferralsWidget';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { useAppSelector } from 'app/store/hooks';
import workspacesSelectors from '../../../store/slices/workspaces/workspaces.selectors';
import WorkspaceSelectorContainer from './WorkspaceSelectorContainer';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { UserSubscription } from '@internxt/sdk/dist/drive/payments/types';

interface SidenavProps {
  user: UserSettings | undefined;
  subscription: UserSubscription | null;
  planUsage: number;
  planLimit: number;
  isLoadingPlanLimit: boolean;
  isLoadingPlanUsage: boolean;
}

const isActiveButton = (path: string) => {
  return !!matchPath(window.location.pathname, { path, exact: true });
};

const handleDownloadApp = async (): Promise<void> => {
  try {
    const download = await desktopService.getDownloadAppUrl();
    window.open(download, '_self');
  } catch {
    notificationsService.show({
      text: 'Something went wrong while downloading the desktop app',
      type: ToastType.Error,
    });
  }
};

const LoadingSpinner = ({ translate }: { translate: (key: string, props?: Record<string, unknown>) => string }) => (
  <div className="absolute z-50 flex h-full w-full flex-col items-center justify-center bg-highlight/40">
    <Spinner className="h-10 w-10" />
    <p className="mt-5 text-2xl font-medium text-gray-100">{translate('workspaces.messages.switchingWorkspace')}</p>
  </div>
);

const SideNavItems = ({ sideNavItems }) => (
  <>
    {sideNavItems.map((item) => (
      <>
        {item.show && (
          <SidenavItem
            label={item.label}
            to={item.to}
            Icon={item.icon}
            iconDataCy={item.iconDataCy}
            isActive={item.isActive}
            notifications={item.notifications}
            onClick={item.onclick}
          />
        )}
      </>
    ))}
  </>
);

const Sidenav = ({
  user,
  subscription,
  planUsage,
  planLimit,
  isLoadingPlanLimit,
  isLoadingPlanUsage,
}: SidenavProps) => {
  const { translate } = useTranslationContext();
  const isB2BWorkspace = !!useSelector(workspacesSelectors.getSelectedWorkspace);
  const isLoadingCredentials = useAppSelector((state: RootState) => state.workspaces.isLoadingCredentials);
  const pendingInvitations = useAppSelector((state: RootState) => state.shared.pendingInvitations);

  const itemsNavigation = [
    {
      to: '/',
      isActive: isActiveButton('/') || isActiveButton('/file/:uuid') || isActiveButton('/folder/:uuid'),
      label: translate('sideNav.drive'),
      icon: FolderSimple,
      iconDataCy: 'sideNavDriveIcon',
      show: true,
    },
    {
      to: '/backups',
      isActive: isActiveButton('/backups'),
      label: translate('sideNav.backups'),
      icon: ClockCounterClockwise,
      iconDataCy: 'sideNavBackupsIcon',
      show: !isB2BWorkspace,
    },
    {
      to: '/shared',
      isActive: isActiveButton('/shared'),
      label: translate('sideNav.shared'),
      icon: Users,
      notifications: pendingInvitations.length,
      iconDataCy: 'sideNavSharedIcon',
      show: true,
    },
    {
      to: '/recents',
      isActive: isActiveButton('/recents'),
      label: translate('sideNav.recents'),
      icon: Clock,
      iconDataCy: 'sideNavRecentsIcon',
      show: !isB2BWorkspace,
    },
    {
      to: '/trash',
      isActive: isActiveButton('/trash'),
      label: translate('sideNav.trash'),
      icon: Trash,
      iconDataCy: 'sideNavTrashIcon',
      show: true,
    },
    {
      label: translate('sideNav.desktop'),
      icon: Desktop,
      iconDataCy: 'sideNavDesktopIcon',
      onclick: handleDownloadApp,
      show: !isB2BWorkspace,
    },
  ];

  const onLogoClicked = () => {
    navigationService.push(AppView.Drive);
  };

  return (
    <div className="flex w-64 flex-col">
      {isLoadingCredentials && <LoadingSpinner translate={translate} />}

      <div
        className="flex h-14 shrink-0 cursor-pointer items-center border-b border-gray-5 pl-8 dark:bg-gray-1"
        onClick={onLogoClicked}
      >
        <InternxtLogo className="h-auto w-28 text-gray-100" />
      </div>

      <div className="flex grow flex-col overflow-x-auto border-r border-gray-5 px-2">
        <div className="mt-2">
          {user && <WorkspaceSelectorContainer user={user} />}
          <SideNavItems sideNavItems={itemsNavigation} />
        </div>

        {subscription && subscription.type === 'free' ? <ReferralsWidget /> : <div className="grow"></div>}

        <div className="mb-11 mt-8 px-5">
          <PlanUsage
            limit={planLimit}
            usage={planUsage}
            subscriptionType={subscription?.type}
            isLoading={isLoadingPlanUsage || isLoadingPlanLimit}
          />
        </div>
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
}))(Sidenav);
