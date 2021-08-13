import { Link } from 'react-router-dom';
import history from '../../lib/history';

import AppHeader from '../../components/AppHeader/AppHeader';
import Sidenav from '../../components/Sidenav/Sidenav';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { uiActions } from '../../store/slices/ui';
import ReachedPlanLimitDialog from '../../components/dialogs/ReachedPlanLimitDialog/ReachedPlanLimitDialog';
import ShareItemDialog from '../../components/dialogs/ShareItemDialog/ShareItemDialog';
import InviteMemberDialog from '../../components/dialogs/InviteMemberDialog/InviteMemberDialog';
import FileLogger from '../../components/FileLogger/FileLogger';

interface HeaderAndSidenavLayoutProps {
  children: JSX.Element
}

export default function HeaderAndSidenavLayout(props: HeaderAndSidenavLayoutProps): JSX.Element {
  const dispatch = useAppDispatch();
  const { children } = props;
  const isAuthenticated: boolean = useAppSelector((state) => state.user.isAuthenticated);
  const isSidenavCollapsed: boolean = useAppSelector((state) => state.ui.isSidenavCollapsed);
  const itemToShare = useAppSelector((state) => state.storage.itemToShare);
  const toggleIsSidenavCollapsed: () => void = () => dispatch(uiActions.setIsSidenavCollapsed(!isSidenavCollapsed));
  const isShareItemDialogOpen = useAppSelector((state) => state.ui.isShareItemDialogOpen);
  const isReachedPlanLimitDialogOpen = useAppSelector((state) => state.ui.isReachedPlanLimitDialogOpen);
  const isInviteMemberDialogOpen = useAppSelector((state) => state.ui.isInviteMemberDialogOpen);

  if (!isAuthenticated) {
    history.push('/');
  }

  return isAuthenticated ? (
    <div className='h-auto min-h-full flex flex-col'>
      {isShareItemDialogOpen && itemToShare && <ShareItemDialog item={itemToShare} />}
      {isReachedPlanLimitDialogOpen && <ReachedPlanLimitDialog />}
      {isInviteMemberDialogOpen && <InviteMemberDialog/>}

      <div className="flex-grow flex">
        <Sidenav collapsed={isSidenavCollapsed} onCollapseButtonClicked={toggleIsSidenavCollapsed} />

        <div className="flex flex-col flex-grow bg-l-neutral-20 pl-8 pr-24px w-1">
          <AppHeader />
          {children}
          <FileLogger />
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