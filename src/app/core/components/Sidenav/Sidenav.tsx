import { Clock, ClockCounterClockwise, Desktop, FolderSimple, Icon, Trash, Users } from '@phosphor-icons/react';
import { connect, useSelector } from 'react-redux';
import { matchPath } from 'react-router-dom';

import desktopService from 'app/core/services/desktop.service';
import PlanUsage from 'app/drive/components/PlanUsage/PlanUsage';
import { RootState } from 'app/store';
import { planSelectors } from 'app/store/slices/plan';
import navigationService from '../../services/navigation.service';
import { AppView } from '../../types';

import { UserSubscription } from '@internxt/sdk/dist/drive/payments/types/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Loader } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import ReferralsWidget from 'app/referrals/components/ReferralsWidget/ReferralsWidget';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import InternxtLogo from 'assets/icons/big-logo.svg?react';
import { t } from 'i18next';
import localStorageService from '../../../core/services/local-storage.service';
import workspacesSelectors from '../../../store/slices/workspaces/workspaces.selectors';
import SidenavItem from './SidenavItem/SidenavItem';
import WorkspaceSelectorContainer from './WorkspaceSelectorContainer';
import { STORAGE_KEYS } from '../../../core/services/storage-keys';
import { HUNDRED_TB } from '../../../core/constants';
import { useEffect } from 'react';
import { sharedThunks } from 'app/store/slices/sharedLinks';
import { useAvatar } from 'hooks/useAvatar';
import { deleteDatabaseProfileAvatar, getDatabaseProfileAvatar } from 'app/drive/services/database.service';
import userService from 'app/auth/services/user.service';
import {
  saveAvatarToDatabase,
  showUpdateAvatarErrorToast,
} from 'app/newSettings/Sections/Account/Account/components/AvatarWrapper';

interface SidenavProps {
  user: UserSettings | undefined;
  subscription: UserSubscription | null;
  planUsage: number;
  planLimit: number;
  isLoadingPlanLimit: boolean;
  isLoadingPlanUsage: boolean;
}

interface SideNavItemsProps {
  label: string;
  icon: Icon;
  iconDataCy: string;
  isVisible: boolean;
  to?: string;
  isActive?: boolean;
  notifications?: number;
  onClick?: () => void;
}

const resetAccessTokenFileFolder = () => {
  localStorageService.set(STORAGE_KEYS.FOLDER_ACCESS_TOKEN, '');
  localStorageService.set(STORAGE_KEYS.FILE_ACCESS_TOKEN, '');
};

const isActiveButton = (path: string) => {
  return !!matchPath(window.location.pathname, { path, exact: true });
};

const handleDownloadApp = (): void => {
  resetAccessTokenFileFolder();
  desktopService
    .getDownloadAppUrl()
    .then((download) => {
      window.open(download, '_self');
    })
    .catch(() => {
      notificationsService.show({
        text: t('notificationMessages.errorDownloadingDesktopApp'),
        type: ToastType.Error,
      });
    });
};

const LoadingSpinner = ({ text }: { text: string }) => (
  <div className="absolute z-50 flex h-full w-full flex-col items-center justify-center bg-highlight/40">
    <Loader classNameLoader="h-10 w-10" />
    <p className="mt-5 text-2xl font-medium text-gray-100">{text}</p>
  </div>
);

const SideNavItems = ({ sideNavItems }: { sideNavItems: SideNavItemsProps[] }) => (
  <>
    {sideNavItems.map((item, index) =>
      item.isVisible ? (
        <SidenavItem
          key={index}
          label={item.label}
          to={item.to}
          Icon={item.icon}
          iconDataCy={item.iconDataCy}
          isActive={item.isActive}
          notifications={item.notifications}
          onClick={item.onClick}
        />
      ) : null,
    )}
  </>
);

const getItemNavigationPath = (path: string, workspaceUuid?: string) => {
  return workspaceUuid ? `${path}?workspaceid=${workspaceUuid}` : `${path}`;
};

const Sidenav = ({
  user,
  subscription,
  planUsage,
  planLimit,
  isLoadingPlanLimit,
  isLoadingPlanUsage,
}: SidenavProps) => {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const isB2BWorkspace = !!useSelector(workspacesSelectors.getSelectedWorkspace);
  const isLoadingCredentials = useAppSelector((state: RootState) => state.workspaces.isLoadingCredentials);
  const isLoadingBusinessLimitAndUsage = useAppSelector(
    (state: RootState) => state.plan.isLoadingBusinessLimitAndUsage,
  );
  const pendingInvitations = useAppSelector((state: RootState) => state.shared.pendingInvitations);
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const workspaceUuid = selectedWorkspace?.workspaceUser.workspaceId;
  const { avatarBlob } = useAvatar({
    avatarSrcURL: user?.avatar || null,
    deleteDatabaseAvatar: deleteDatabaseProfileAvatar,
    downloadAvatar: userService.downloadAvatar,
    getDatabaseAvatar: getDatabaseProfileAvatar,
    saveAvatarToDatabase: saveAvatarToDatabase,
    onError: showUpdateAvatarErrorToast,
  });

  useEffect(() => {
    dispatch(sharedThunks.getPendingInvitations());
  }, []);

  const itemsNavigation: SideNavItemsProps[] = [
    {
      to: getItemNavigationPath('/', workspaceUuid),
      isActive: isActiveButton('/') || isActiveButton('/file/:uuid') || isActiveButton('/folder/:uuid'),
      label: translate('sideNav.drive'),
      icon: FolderSimple,
      iconDataCy: 'sideNavDriveIcon',
      isVisible: true,
      onClick: resetAccessTokenFileFolder,
    },
    {
      to: getItemNavigationPath('/backups'),
      isActive: isActiveButton('/backups'),
      label: translate('sideNav.backups'),
      icon: ClockCounterClockwise,
      iconDataCy: 'sideNavBackupsIcon',
      isVisible: !isB2BWorkspace,
    },
    {
      to: getItemNavigationPath('/shared', workspaceUuid),
      isActive: isActiveButton('/shared'),
      label: translate('sideNav.shared'),
      icon: Users,
      notifications: pendingInvitations.length,
      iconDataCy: 'sideNavSharedIcon',
      isVisible: true,
      onClick: resetAccessTokenFileFolder,
    },
    {
      to: getItemNavigationPath('/recents'),
      isActive: isActiveButton('/recents'),
      label: translate('sideNav.recents'),
      icon: Clock,
      iconDataCy: 'sideNavRecentsIcon',
      isVisible: !isB2BWorkspace,
    },
    {
      to: getItemNavigationPath('/trash', workspaceUuid),
      isActive: isActiveButton('/trash'),
      label: translate('sideNav.trash'),
      icon: Trash,
      iconDataCy: 'sideNavTrashIcon',
      isVisible: true,
      onClick: resetAccessTokenFileFolder,
    },
    {
      label: translate('sideNav.desktop'),
      icon: Desktop,
      iconDataCy: 'sideNavDesktopIcon',
      onClick: handleDownloadApp,
      isVisible: !isB2BWorkspace,
    },
  ];

  const onLogoClicked = () => {
    navigationService.push(AppView.Drive, {}, workspaceUuid);
  };

  const isUpgradeAvailable = () => {
    const isLifetimeAvailable = subscription?.type === 'lifetime' && planLimit < HUNDRED_TB;

    return subscription?.type === 'free' || isLifetimeAvailable;
  };

  return (
    <div className="flex w-64 flex-col">
      {isLoadingCredentials && <LoadingSpinner text={translate('workspaces.messages.switchingWorkspace')} />}

      <button
        className="flex h-14 shrink-0 cursor-pointer items-center border-b border-gray-5 pl-8 dark:bg-gray-1"
        onClick={onLogoClicked}
      >
        <InternxtLogo className="h-auto w-28 text-gray-100" />
      </button>
      <div className="flex grow flex-col overflow-x-auto border-r border-gray-5 px-2">
        <div className="mt-2 flex w-full flex-col">
          {user && (
            <WorkspaceSelectorContainer
              user={{
                ...user,
                avatar: avatarBlob ? URL.createObjectURL(avatarBlob) : user.avatar,
              }}
            />
          )}
          <SideNavItems sideNavItems={itemsNavigation} />
        </div>

        {subscription && subscription.type === 'free' ? <ReferralsWidget /> : <div className="grow"></div>}

        <div className="mb-11 mt-8 px-5">
          <PlanUsage
            limit={planLimit}
            usage={planUsage}
            isUpgradeAvailable={isUpgradeAvailable}
            isLoading={isLoadingPlanUsage || isLoadingPlanLimit || isLoadingBusinessLimitAndUsage}
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
