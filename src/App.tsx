import { useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { Toaster } from 'react-hot-toast';
import { connect } from 'react-redux';
import { Redirect, Route, Router, Switch } from 'react-router-dom';

import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { AppView } from 'app/core/types';
import { FolderPath } from 'app/drive/types';
import i18next, { t } from 'i18next';
import { pdfjs } from 'react-pdf';
import { PATH_NAMES, serverPage } from './app/analytics/services/analytics.service';
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
import { LRUPhotosCacheManager } from './app/database/services/database.service/LRUPhotosCacheManager';
import { LRUPhotosPreviewsCacheManager } from './app/database/services/database.service/LRUPhotosPreviewCacheManager';
import FileViewerWrapper from './app/drive/components/FileViewer/FileViewerWrapper';
import FileSizeLimitDialogContainer from './app/drive/components/LimitDialogs/FileSizeLimitDialogContainer';
import ShareItemsLimitDialogContainer from './app/drive/components/LimitDialogs/ShareItemsLimitDialogContainer';
import Mobile from './app/drive/views/MobileView/MobileView';
import NewsletterDialog from './app/newsletter/components/NewsletterDialog/NewsletterDialog';
import SharingRedirect from './app/routes/Share/ShareRedirection';
import { getRoutes } from './app/routes/routes';
import { domainManager } from './app/share/services/DomainManager';
import { PreviewFileItem } from './app/share/types';
import { AppDispatch, RootState } from './app/store';
import { sessionActions } from './app/store/slices/session';
import { uiActions } from './app/store/slices/ui';
import { initializeUserThunk } from './app/store/slices/user';
import SurveyDialog from './app/survey/components/SurveyDialog/SurveyDialog';
import { manager } from './app/utils/dnd-utils';
import useBeforeUnload from './hooks/useBeforeUnload';
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

interface AppProps {
  isAuthenticated: boolean;
  isInitialized: boolean;
  isFileViewerOpen: boolean;
  isNewsletterDialogOpen: boolean;
  isSurveyDialogOpen: boolean;
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
    isSurveyDialogOpen,
    fileViewerItem,
    dispatch,
  } = props;

  const token = localStorageService.get('xToken');
  const params = new URLSearchParams(window.location.search);
  const skipSignupIfLoggedIn = params.get('skipSignupIfLoggedIn') === 'true';
  const queryParameters = navigationService.history.location.search;
  const routes = getRoutes();
  const isDev = !envService.isProduction();
  const currentRouteConfig: AppViewConfig | undefined = configService.getViewConfig({
    path: navigationService.history.location.pathname,
  });

  useBeforeUnload();

  useEffect(() => {
    initializeInitialAppState();
    i18next.changeLanguage();
  }, []);

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
      await LRUPhotosCacheManager.getInstance();
      await LRUPhotosPreviewsCacheManager.getInstance();

      await domainManager.fetchDomains();

      RealtimeService.getInstance().init();

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

  if (navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/Android/i)) {
    isMobile = true;
  }

  if (window.location.pathname) {
    if ((pathName === 'new' || pathName === 'appsumo') && window.location.search !== '') {
      window.rudderanalytics.page(PATH_NAMES[window.location.pathname]);
      serverPage(PATH_NAMES[window.location.pathname]).catch(() => {
        // NO OP
      });
    }
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
      navigationService.push(AppView.Drive);
    } else {
      navigationService.pushFolder(fileViewerItem?.folderUuid);
    }
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
            <Route path="/sharings/:sharingId/:action" component={SharingRedirect} />
            <Redirect from="/s/file/:token([a-z0-9]{20})/:code?" to="/sh/file/:token([a-z0-9]{20})/:code?" />
            <Redirect from="/s/folder/:token([a-z0-9]{20})/:code?" to="/sh/folder/:token([a-z0-9]{20})/:code?" />
            <Redirect from="/s/photos/:token([a-z0-9]{20})/:code?" to="/sh/photos/:token([a-z0-9]{20})/:code?" />
            <Redirect from="/account" to="/preferences" />
            <Redirect from="/app/:section?" to={{ pathname: '/:section?', search: `${queryParameters}` }} />
            {pathName !== 'checkout-plan' && isMobile && isAuthenticated ? (
              <Route path="*">
                <Mobile user={props.user} />
              </Route>
            ) : (
              routes
            )}
          </Switch>

          <Toaster
            position="bottom-center"
            containerStyle={{
              filter: 'drop-shadow(0 32px 40px rgba(18, 22, 25, 0.08))',
            }}
          />

          <NewsletterDialog isOpen={isNewsletterDialogOpen} />
          {isSurveyDialogOpen && <SurveyDialog isOpen={isSurveyDialogOpen} />}
          <FileSizeLimitDialogContainer />
          <ShareItemsLimitDialogContainer />
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
  isSurveyDialogOpen: state.ui.isSurveyDialogOpen,
  fileViewerItem: state.ui.fileViewerItem,
  user: state.user.user,
  namePath: state.storage.namePath,
}))(App);
