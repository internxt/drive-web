import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import AppHeader from '../../components/AppHeader/AppHeader';
import CreateFolderDialog from '../../components/dialogs/CreateFolderDialog/CreateFolderDialog';
import DeleteItemsDialog from '../../components/dialogs/DeleteItemsDialog/DeleteItemsDialog';

import ShareItemDialog from '../../components/dialogs/ShareItemDialog/ShareItemDialog';
import Sidenav from '../../components/Sidenav/Sidenav';
import { RootState } from '../../store';
import { useAppDispatch } from '../../store/hooks';
import { setItemToShare } from '../../store/slices/storage';
import FileLoggerModal from '../../components/FileLoggerModal';
import { uiActions } from '../../store/slices/ui';
import ReachedPlanLimitDialog from '../../components/dialogs/ReachedPlanLimitDialog/ReachedPlanLimitDialog';
import { useEffect } from 'react';
import SessionStorage from '../../lib/sessionStorage';
import { getLimit } from '../../services/limit.service';
import localStorageService from '../../services/localStorage.service';
import InviteMemberDialog from '../../components/dialogs/InviteMemberDialog/InviteMemberDialog';

interface HeaderAndSidenavLayoutProps {
  children: JSX.Element
}

export default function HeaderAndSidenavLayout(props: HeaderAndSidenavLayoutProps): JSX.Element {
  const dispatch = useAppDispatch();
  const { children } = props;
  const isAuthenticated: boolean = useSelector((state: RootState) => state.user.isAuthenticated);
  const isSidenavCollapsed: boolean = useSelector((state: RootState) => state.ui.isSidenavCollapsed);
  const currentItems: any[] = useSelector((state: RootState) => state.storage.items);
  const itemToShareId: number = useSelector((state: RootState) => state.storage.itemToShareId);
  const itemToShare: any = currentItems.find(item => item.id === itemToShareId);
  const toggleIsSidenavCollapsed: () => void = () => dispatch(uiActions.setIsSidenavCollapsed(!isSidenavCollapsed));

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
      {!!itemToShare &&
        <ShareItemDialog
          open={!!itemToShareId}
          item={itemToShare}
          onClose={() => dispatch(setItemToShare(0))}
        />
      }

      <CreateFolderDialog />

      <DeleteItemsDialog />

      <ReachedPlanLimitDialog />
      <InviteMemberDialog />

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