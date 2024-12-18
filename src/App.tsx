import { useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { Toaster } from 'react-hot-toast';
import { connect } from 'react-redux';
import { Redirect, Route, Router, Switch } from 'react-router-dom';

import { Portal } from '@headlessui/react';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { ActionDialog } from 'app/contexts/dialog-manager/ActionDialogManager.context';
import { useActionDialog } from 'app/contexts/dialog-manager/useActionDialog';
import { AppView } from 'app/core/types';
import { FolderPath } from 'app/drive/types';
import { ModifyStorageModal } from 'app/newSettings/Sections/Workspace/Members/components/ModifyStorageModal';
import { useAppSelector } from 'app/store/hooks';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import i18next, { t } from 'i18next';
import { pdfjs } from 'react-pdf';
import PreparingWorkspaceAnimation from './app/auth/components/PreparingWorkspaceAnimation/PreparingWorkspaceAnimation';
import authService from './app/auth/services/auth.service';
import configService from './app/core/services/config.service';
import envService from './app/core/services/env.service';
import errorService from './app/core/services/error.service';
import localStorageService from './app/core/services/local-storage.service';
import navigationService from './app/core/services/navigation.service';
import RealtimeService from './app/core/services/socket.service';
import { AppViewConfig } from './app/core/types';
import { LRUFilesCacheManager } from './app/database/services/database.service/LRUFilesCacheManager';
import { LRUFilesPreviewCacheManager } from './app/database/services/database.service/LRUFilesPreviewCacheManager';
import FileViewerWrapper from './app/drive/components/FileViewer/FileViewerWrapper';
import Mobile from './app/drive/views/MobileView/MobileView';
import PreferencesDialog from './app/newSettings/PreferencesDialog';
import { usePreferencesParamsChange } from './app/newSettings/hooks/usePreferencesParamsChange';
import NewsletterDialog from './app/newsletter/components/NewsletterDialog/NewsletterDialog';
import SharingRedirect from './app/routes/Share/ShareRedirection';
import WorkspacesRedirect from './app/routes/Workspaces/WorkspacesRedirection';
import { getRoutes } from './app/routes/routes';
import { domainManager } from './app/share/services/DomainManager';
import { PreviewFileItem } from './app/share/types';
import { AppDispatch, RootState } from './app/store';
import { sessionActions } from './app/store/slices/session';
import { uiActions } from './app/store/slices/ui';
import { initializeUserThunk } from './app/store/slices/user';
import { workspaceThunks } from './app/store/slices/workspaces/workspacesStore';
import { manager } from './app/utils/dnd-utils';
import useBeforeUnload from './hooks/useBeforeUnload';
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

interface AppProps {
  isAuthenticated: boolean;
  isInitialized: boolean;
  isFileViewerOpen: boolean;
  isNewsletterDialogOpen: boolean;
  isPreferencesDialogOpen: boolean;
  fileViewerItem: PreviewFileItem | null;
  user: UserSettings | undefined;
  namePath: FolderPath[];
  dispatch: AppDispatch;
}

const App = (props: AppProps): JSX.Element => {
  const {
    isInitialized,
    isAuthenticated,
    isFileViewerOpen,
    isNewsletterDialogOpen,
    isPreferencesDialogOpen,
    fileViewerItem,
    dispatch,
  } = props;

  const { isDialogOpen } = useActionDialog();
  const isOpen = isDialogOpen(ActionDialog.ModifyStorage);
  const token = localStorageService.get('xToken');
  const params = new URLSearchParams(window.location.search);
  const skipSignupIfLoggedIn = params.get('skipSignupIfLoggedIn') === 'true';
  const queryParameters = navigationService.history.location.search;
  const havePreferencesParamsChanged = usePreferencesParamsChange();
  const routes = getRoutes();
  const isDev = !envService.isProduction();
  const currentRouteConfig: AppViewConfig | undefined = configService.getViewConfig({
    path: navigationService.history.location.pathname,
  });
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const isWorkspaceIdParam = params.get('workspaceid');

  useBeforeUnload();

  useEffect(() => {
    initializeInitialAppState();
    i18next.changeLanguage();
  }, []);

  useEffect(() => {
    if (!isWorkspaceIdParam) {
      navigationService.resetB2BWorkspaceCredentials(dispatch);
    }
  }, [params]);

  if ((token && skipSignupIfLoggedIn) || (token && navigationService.history.location.pathname !== '/new')) {
    /**
     * In case we receive a valid redirectUrl param, we return to that URL with the current token
     */
    const redirectUrl = authService.getRedirectUrl(params, token);

    if (redirectUrl) {
      window.location.replace(redirectUrl);
    }
  }

  window.addEventListener('offline', () => {
    dispatch(sessionActions.setHasConnection(false));
  });
  window.addEventListener('online', () => {
    dispatch(sessionActions.setHasConnection(true));
  });

  const initializeInitialAppState = async () => {
    try {
      await LRUFilesCacheManager.getInstance();
      await LRUFilesPreviewCacheManager.getInstance();

      await domainManager.fetchDomains();

      RealtimeService.getInstance().init();

      dispatch(workspaceThunks.fetchWorkspaces());
      navigationService.setWorkspaceFromParams(workspaceThunks, dispatch, false);

      await props.dispatch(
        initializeUserThunk({
          redirectToLogin: !!currentRouteConfig?.auth,
        }),
      );
    } catch (err: unknown) {
      const error = errorService.castError(err);
      errorService.reportError(error);
    }
  };

  const pathName = window.location.pathname.split('/')[1];
  let template = <PreparingWorkspaceAnimation />;
  let isMobile = false;

  const isIphone = /iPhone/i.exec(navigator.userAgent);
  const isAndroid = /Android/i.exec(navigator.userAgent);

  if (isIphone || isAndroid) {
    isMobile = true;
  }

  const onCloseFileViewer = () => {
    const isRecentsView = navigationService.isCurrentPath('recents');
    const isSharedView = navigationService.isCurrentPath('shared');
    const isBackups = navigationService.isCurrentPath('backups');
    const isRootDrive = props.namePath.length === 1;

    if (isRecentsView || isSharedView || isBackups) {
      dispatch(uiActions.setIsFileViewerOpen(false));
    } else if (isRootDrive) {
      dispatch(uiActions.setIsFileViewerOpen(false));
      navigationService.push(AppView.Drive, {}, selectedWorkspace?.workspaceUser.workspaceId);
    } else {
      navigationService.pushFolder(fileViewerItem?.folderUuid, selectedWorkspace?.workspaceUser.workspaceId);
    }

    dispatch(uiActions.setFileViewerItem(null));
  };

  if (!isAuthenticated || isInitialized) {
    template = (
      <DndProvider manager={manager}>
        <Router history={navigationService.history}>
          {isDev && configService.getAppConfig().debug.enabled && (
            <span
              className="\ \ pointer-events-none absolute -right-7 top-5
               z-50 w-28 rotate-45 bg-red px-3.5 py-1 text-center text-supporting-2 font-bold
               tracking-wider text-white/80 drop-shadow-2xl"
            >
              {t('general.stage.development')}
            </span>
          )}
          <Switch>
            <Route path="/workspaces/:invitationId/:action" component={WorkspacesRedirect} />
            <Route path="/sharings/:sharingId/:action" component={SharingRedirect} />
            <Redirect from="/s/file/:token([a-z0-9]{20})/:code?" to="/sh/file/:token([a-z0-9]{20})/:code?" />
            <Redirect from="/s/folder/:token([a-z0-9]{20})/:code?" to="/sh/folder/:token([a-z0-9]{20})/:code?" />
            <Redirect from="/s/photos/:token([a-z0-9]{20})/:code?" to="/sh/photos/:token([a-z0-9]{20})/:code?" />
            <Redirect from="/account" to="/?preferences=open&section=account&subsection=account" />
            <Redirect
              from="/preferences"
              to={`/?preferences=open&section=account&subsection=${params.get('tab') ?? 'account'}`}
            />
            <Redirect from="/app/:section?" to={{ pathname: '/:section?', search: `${queryParameters}` }} />
            {pathName !== 'checkout' && isMobile && isAuthenticated ? (
              <Route path="*">
                <Mobile user={props.user} />
              </Route>
            ) : (
              routes
            )}
          </Switch>

          <Portal>
            <Toaster
              position="bottom-center"
              containerStyle={{
                filter: 'drop-shadow(0 32px 40px rgba(18, 22, 25, 0.08))',
              }}
            />
          </Portal>

          <PreferencesDialog
            haveParamsChanged={havePreferencesParamsChanged}
            isPreferencesDialogOpen={isPreferencesDialogOpen}
          />

          {isOpen && <ModifyStorageModal />}

          <NewsletterDialog isOpen={isNewsletterDialogOpen} />
          {isFileViewerOpen && fileViewerItem && (
            <FileViewerWrapper file={fileViewerItem} onClose={onCloseFileViewer} showPreview={isFileViewerOpen} />
          )}
        </Router>
      </DndProvider>
    );
  }

  return template;
};

export default connect((state: RootState) => ({
  isAuthenticated: state.user.isAuthenticated,
  isInitialized: state.user.isInitialized,
  isFileViewerOpen: state.ui.isFileViewerOpen,
  isNewsletterDialogOpen: state.ui.isNewsletterDialogOpen,
  isPreferencesDialogOpen: state.ui.isPreferencesDialogOpen,
  fileViewerItem: state.ui.fileViewerItem,
  user: state.user.user,
  namePath: state.storage.namePath,
}))(App);
