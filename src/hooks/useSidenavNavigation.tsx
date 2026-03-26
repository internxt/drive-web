import { useCallback, useMemo } from 'react';
import { matchPath } from 'react-router-dom';
import { Clock, ClockCounterClockwise, Desktop, FolderSimple, Trash, Users } from '@phosphor-icons/react';
import { useSelector } from 'react-redux';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useAppSelector } from 'app/store/hooks';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import { SidenavOption } from '@internxt/ui/dist/components/sidenav/SidenavOptions';
import { AppView } from 'app/core/types';
import { RootState } from 'app/store';
import localStorageService from 'services/local-storage.service';
import { STORAGE_KEYS } from 'services/storage-keys';
import desktopService from 'services/desktop.service';
import { Translate } from 'app/i18n/types';
import { navigationService } from 'services';

const resetAccessTokenFileFolder = () => {
  localStorageService.set(STORAGE_KEYS.FOLDER_ACCESS_TOKEN, '');
  localStorageService.set(STORAGE_KEYS.FILE_ACCESS_TOKEN, '');
};

const isActiveButton = (path: string) => {
  return !!matchPath(globalThis.location.pathname, { path, exact: true });
};

const handleDownloadApp = (translate: Translate): void => {
  resetAccessTokenFileFolder();
  desktopService.openDownloadAppUrl(translate);
};

export const useSidenavNavigation = () => {
  const { translate } = useTranslationContext();
  const isB2BWorkspace = !!useSelector(workspacesSelectors.getSelectedWorkspace);
  const pendingInvitations = useAppSelector((state: RootState) => state.shared.pendingInvitations);
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const workspaceUuid = selectedWorkspace?.workspaceUser.workspaceId;

  const onSidenavItemClick = useCallback(
    (path: AppView, workspaceUuid?: string, cb?: () => void) => {
      cb?.();
      navigationService.push(path, {}, workspaceUuid);
    },
    [navigationService, workspaceUuid],
  );

  const itemsNavigation: SidenavOption[] = useMemo(
    () => [
      {
        isActive: isActiveButton('/') || isActiveButton('/file/:uuid') || isActiveButton('/folder/:uuid'),
        label: translate('sideNav.drive'),
        icon: FolderSimple,
        iconDataCy: 'sideNavDriveIcon',
        isVisible: true,
        onClick: () => onSidenavItemClick(AppView.Drive, workspaceUuid, resetAccessTokenFileFolder),
      },
      {
        isActive: isActiveButton('/backups'),
        label: translate('sideNav.backups'),
        icon: ClockCounterClockwise,
        iconDataCy: 'sideNavBackupsIcon',
        isVisible: !isB2BWorkspace,
        onClick: () => onSidenavItemClick(AppView.Backups, workspaceUuid, resetAccessTokenFileFolder),
      },
      {
        isActive: isActiveButton('/shared'),
        label: translate('sideNav.shared'),
        icon: Users,
        notifications: pendingInvitations.length > 0 ? pendingInvitations.length : undefined,
        iconDataCy: 'sideNavSharedIcon',
        isVisible: true,
        onClick: () => onSidenavItemClick(AppView.Shared, workspaceUuid, resetAccessTokenFileFolder),
      },
      {
        isActive: isActiveButton('/recents'),
        label: translate('sideNav.recents'),
        icon: Clock,
        iconDataCy: 'sideNavRecentsIcon',
        isVisible: !isB2BWorkspace,
        onClick: () => onSidenavItemClick(AppView.Recents, workspaceUuid, resetAccessTokenFileFolder),
      },
      {
        isActive: isActiveButton('/trash'),
        label: translate('sideNav.trash'),
        icon: Trash,
        iconDataCy: 'sideNavTrashIcon',
        isVisible: true,
        onClick: () => onSidenavItemClick(AppView.Trash, workspaceUuid, resetAccessTokenFileFolder),
      },
      {
        label: translate('sideNav.desktop'),
        icon: Desktop,
        iconDataCy: 'sideNavDesktopIcon',
        onClick: () => handleDownloadApp(translate),
        isVisible: !isB2BWorkspace,
      },
    ],
    [workspaceUuid, pendingInvitations.length, isB2BWorkspace, translate, onSidenavItemClick],
  );

  return { itemsNavigation };
};
