import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import AppHeader from '../../components/AppHeader/AppHeader';
import CreateFolderDialog from '../../components/dialogs/CreateFolderDialog/CreateFolderDialog';
import DeleteItemsDialog from '../../components/dialogs/DeleteItemsDialog/DeleteItemsDialog';

import FileLogger from '../../components/FileLoggerModal';
import ShareItemDialog from '../../components/dialogs/ShareItemDialog/ShareItemDialog';
import SideNavigator from '../../components/SideNavigator/SideNavigator';
import { RootState } from '../../store';
import { useAppDispatch } from '../../store/hooks';
import { setItemToShare } from '../../store/slices/storage';

interface HeaderAndSidenavLayoutProps {
  children: JSX.Element
}

export default function HeaderAndSidenavLayout(props: HeaderAndSidenavLayoutProps): JSX.Element {
  const dispatch = useAppDispatch();
  const { children } = props;
  const isAuthenticated: boolean = useSelector((state: RootState) => state.user.isAuthenticated);
  const isCreateFolderDialogOpen: boolean = useSelector((state: RootState) => state.ui.isCreateFolderDialogOpen);
  const isDeleteItemsDialogOpen: boolean = useSelector((state: RootState) => state.ui.isDeleteItemsDialogOpen);
  const currentItems: any[] = useSelector((state: RootState) => state.storage.items);
  const itemToShareId: number = useSelector((state: RootState) => state.storage.itemToShareId);
  const itemToShare: any = currentItems.find(item => item.id === itemToShareId);

  return isAuthenticated ? (
    <div className="h-auto min-h-full flex flex-col">

      { !!itemToShare &&
        <ShareItemDialog
          open={!!itemToShareId}
          item={itemToShare}
          onClose={() => dispatch(setItemToShare(0))}
        />
      }

      <CreateFolderDialog
        open={isCreateFolderDialogOpen}
      />

      <DeleteItemsDialog
        open={isDeleteItemsDialogOpen}
      />

      <FileLogger />

      <div className="flex-grow flex">
        <SideNavigator />

        <div className="flex flex-col flex-grow bg-l-neutral-20 pl-4 pr-24px">
          <AppHeader />
          {children}
        </div>
      </div>

      <footer className="app-footer"></footer>

    </div>
  ) : (
    <div className="App">
      <h2>
        Please <Link to="/login">login</Link> into your Internxt Drive account
      </h2>
    </div>
  );
}