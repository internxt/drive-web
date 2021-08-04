import { Link } from 'react-router-dom';
import AppHeader from '../../components/AppHeader/AppHeader';
import DeleteItemsDialog from '../../components/dialogs/DeleteItemsDialog/DeleteItemsDialog';
import Sidenav from '../../components/Sidenav/Sidenav';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import FileLoggerModal from '../../components/FileLoggerModal';
import { uiActions } from '../../store/slices/ui';
import ReachedPlanLimitDialog from '../../components/dialogs/ReachedPlanLimitDialog/ReachedPlanLimitDialog';
import { useEffect } from 'react';
import SessionStorage from '../../lib/sessionStorage';
import { getLimit } from '../../services/limit.service';
import localStorageService from '../../services/localStorage.service';
import ShareItemDialog from '../../components/dialogs/ShareItemDialog/ShareItemDialog';
import { DriveItemData } from '../../models/interfaces';
import InviteMemberDialog from '../../components/dialogs/InviteMemberDialog/InviteMemberDialog';

interface HeaderAndSidenavLayoutProps {
  children: JSX.Element
}

export default function HeaderAndSidenavLayout(props: HeaderAndSidenavLayoutProps): JSX.Element {
  const dispatch = useAppDispatch();
  const { children } = props;
  const isAuthenticated: boolean = useAppSelector((state) => state.user.isAuthenticated);
  const isSidenavCollapsed: boolean = useAppSelector((state) => state.ui.isSidenavCollapsed);
  const currentItems: DriveItemData[] = useAppSelector((state) => state.storage.items);
  const itemToShareId: number = useAppSelector((state) => state.storage.itemToShareId);
  const itemToShare: DriveItemData | undefined = currentItems.find(item => item.id === itemToShareId);
  const toggleIsSidenavCollapsed: () => void = () => dispatch(uiActions.setIsSidenavCollapsed(!isSidenavCollapsed));
  const isShareItemDialogOpen = useAppSelector((state) => state.ui.isShareItemDialogOpen);
  const isDeleteItemsDialogOpen = useAppSelector((state) => state.ui.isDeleteItemsDialogOpen);
  const isReachedPlanLimitDialogOpen = useAppSelector((state) => state.ui.isReachedPlanLimitDialogOpen);
  const isInviteMemberDialogOpen = useAppSelector((state) => state.ui.isInviteMemberDialogOpen);

  useEffect(() => {
    const limitStorage = SessionStorage.get('limitStorage');
    const teamsStorage = SessionStorage.get('teamsStorage');

    if (!limitStorage) {
      getLimit(false).then((limitStorage) => {
        if (limitStorage) {
          SessionStorage.set('limitStorage', limitStorage);
        }
      });
    }

    if (!teamsStorage) {
      if (localStorageService.get('xTeam')) {
        getLimit(true).then((teamsStorage) => {
          if (teamsStorage) {
            SessionStorage.set('teamsStorage', teamsStorage);
          }
        });
      }
    }

  }, []);

  return isAuthenticated ? (
    <div className='h-auto min-h-full flex flex-col'>
      {isShareItemDialogOpen && itemToShare && <ShareItemDialog item={itemToShare} />}
      {isDeleteItemsDialogOpen && <DeleteItemsDialog />}
      {isReachedPlanLimitDialogOpen && <ReachedPlanLimitDialog />}
      {isInviteMemberDialogOpen && <InviteMemberDialog/>}

      <div className="flex-grow flex">
        <Sidenav collapsed={isSidenavCollapsed} onCollapseButtonClicked={toggleIsSidenavCollapsed} />

        <div className="flex flex-col flex-grow bg-l-neutral-20 pl-8 pr-24px">
          <AppHeader />
          {children}
          <FileLoggerModal />
          <footer className="bg-l-neutral-20 h-footer"></footer>
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