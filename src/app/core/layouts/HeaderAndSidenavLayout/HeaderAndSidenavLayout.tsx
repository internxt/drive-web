import { Link, useLocation } from 'react-router-dom';

import Navbar from '../../components/Navbar/NavbarGlobalSearch';
import Sidenav from '../../components/Sidenav/Sidenav';
import { uiActions } from 'app/store/slices/ui';
import ReachedPlanLimitDialog from 'app/drive/components/ReachedPlanLimitDialog/ReachedPlanLimitDialog';
import navigationService from '../../services/navigation.service';
import GuestDialog from 'app/guests/components/GuestDialog/GuestDialog';
import { AppView } from '../../types';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import TaskLogger from 'app/tasks/components/TaskLogger/TaskLogger';
import DriveItemInfoMenu from 'app/drive/components/DriveItemInfoMenu/DriveItemInfoMenu';
import SharedFolderTooBigDialog from '../../../drive/components/SharedFolderTooBigDialog/SharedFolderTooBigDialog';
import { getAppConfig } from '../../services/config.service';
import ShareItemDialog from '../../../share/components/ShareItemDialog/ShareItemDialog';

export interface HeaderAndSidenavLayoutProps {
  children: JSX.Element;
}

export default function HeaderAndSidenavLayout(props: HeaderAndSidenavLayoutProps): JSX.Element {
  const dispatch = useAppDispatch();
  const { children } = props;
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const itemToShare = useAppSelector((state) => state.storage.itemToShare);
  const isShareItemDialogOpen = useAppSelector((state) => state.ui.isShareItemDialogOpen);
  const isReachedPlanLimitDialogOpen = useAppSelector((state) => state.ui.isReachedPlanLimitDialogOpen);
  const isSharedFolderTooBigDialogOpen = useAppSelector((state) => state.ui.isSharedFolderTooBigDialogOpen);
  const isGuestInviteDialogOpen = useAppSelector((state) => state.ui.isGuestInviteDialogOpen);
  const isDriveItemInfoMenuOpen = useAppSelector((state) => state.ui.isDriveItemInfoMenuOpen);
  const driveItemInfo = useAppSelector((state) => state.ui.currentFileInfoMenuItem);
  const onDriveItemInfoMenuClosed = () => {
    dispatch(uiActions.setFileInfoItem(null));
    dispatch(uiActions.setIsDriveItemInfoMenuOpen(false));
  };
  const location = useLocation();
  const hideSearch = getAppConfig().views.find((view) => view.path === location.pathname)?.hideSearch;

  if (!isAuthenticated) {
    navigationService.push(AppView.Login);
  }

  return isAuthenticated ? (
    <div className="flex h-auto min-h-full flex-col">
      {isShareItemDialogOpen && itemToShare && <ShareItemDialog share={itemToShare?.share} item={itemToShare.item} />}
      {isReachedPlanLimitDialogOpen && <ReachedPlanLimitDialog />}
      {isSharedFolderTooBigDialogOpen && <SharedFolderTooBigDialog />}
      {isGuestInviteDialogOpen && <GuestDialog />}

      <div className="flex h-1 grow">
        <Sidenav />

        <div className="flex w-1 grow flex-col">
          <Navbar hideSearch={hideSearch} />
          <div className="flex h-1 w-full grow">
            {children}

            {isDriveItemInfoMenuOpen && driveItemInfo && (
              <DriveItemInfoMenu {...driveItemInfo} onClose={onDriveItemInfoMenuClosed} />
            )}
          </div>
          <TaskLogger />
        </div>
      </div>
    </div>
  ) : (
    <div className="App">
      <h2>
        Please <Link to="/login">login</Link> into your Internxt Drive account
      </h2>
    </div>
  );
}
