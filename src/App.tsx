import { createElement, useEffect, useState } from 'react';
import { Switch, Route, Redirect, Router, RouteProps, useParams, useHistory } from 'react-router-dom';
import { connect } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { DndProvider } from 'react-dnd';

import configService from './app/core/services/config.service';
import errorService from './app/core/services/error.service';
import envService from './app/core/services/env.service';
import { AppViewConfig } from './app/core/types';
import navigationService from './app/core/services/navigation.service';
import layouts from './app/core/layouts';
import { PATH_NAMES, serverPage } from './app/analytics/services/analytics.service';
import { sessionActions } from './app/store/slices/session';
import { AppDispatch, RootState } from './app/store';
import { initializeUserThunk } from './app/store/slices/user';
import { uiActions } from './app/store/slices/ui';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import views from './app/core/config/views';
import NewsletterDialog from './app/newsletter/components/NewsletterDialog/NewsletterDialog';
import SurveyDialog from './app/survey/components/SurveyDialog/SurveyDialog';
import PreparingWorkspaceAnimation from './app/auth/components/PreparingWorkspaceAnimation/PreparingWorkspaceAnimation';
import FileViewerWrapper from './app/drive/components/FileViewer/FileViewerWrapper';
import { pdfjs } from 'react-pdf';
import { LRUFilesCacheManager } from './app/database/services/database.service/LRUFilesCacheManager';
import { LRUFilesPreviewCacheManager } from './app/database/services/database.service/LRUFilesPreviewCacheManager';
import { LRUPhotosPreviewsCacheManager } from './app/database/services/database.service/LRUPhotosPreviewCacheManager';
import { LRUPhotosCacheManager } from './app/database/services/database.service/LRUPhotosCacheManager';
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;
import { t } from 'i18next';
import authService from './app/auth/services/auth.service';
import localStorageService from './app/core/services/local-storage.service';
import Mobile from './app/drive/views/MobileView/MobileView';
import RealtimeService from './app/core/services/socket.service';
import { domainManager } from './app/share/services/DomainManager';
import { PreviewFileItem } from './app/share/types';
import { FolderPath } from 'app/drive/types';
import { manager } from './app/utils/dnd-utils';
import { AppView } from 'app/core/types';
import useBeforeUnload from './hooks/useBeforeUnload';
import PreferencesDialog from 'app/preferences';

interface AppProps {
  isAuthenticated: boolean;
  isInitialized: boolean;
  isFileViewerOpen: boolean;
  isNewsletterDialogOpen: boolean;
  isSurveyDialogOpen: boolean;
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
    isSurveyDialogOpen,
    isPreferencesDialogOpen,
    fileViewerItem,
  } = props;
  const token = localStorageService.get('xToken');
  const params = new URLSearchParams(window.location.search);
  const skipSignupIfLoggedIn = params.get('skipSignupIfLoggedIn') === 'true';
  const queryParameters = navigationService.history.location.search;
  const isOpenPreferencesDialog = params.get('preferences') === 'open';
  const [haveParamsChanged, setHaveParamsChanged] = useState(false);

  useEffect(() => {
    window.onpopstate = () => {
      setHaveParamsChanged(true);
    };
  });

  useEffect(() => {
    if (isOpenPreferencesDialog) {
      dispatch(uiActions.setIsPreferencesDialogOpen(true));
      setHaveParamsChanged(false);
    } else {
      dispatch(uiActions.setIsPreferencesDialogOpen(false));
      setHaveParamsChanged(false);
    }
  }, [haveParamsChanged]);

  useBeforeUnload();

  useEffect(() => {
    initialState();
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

  const currentRouteConfig: AppViewConfig | undefined = configService.getViewConfig({
    path: navigationService.history.location.pathname,
  });

  const dispatch: AppDispatch = props.dispatch;

  window.addEventListener('offline', () => {
    dispatch(sessionActions.setHasConnection(false));
  });
  window.addEventListener('online', () => {
    dispatch(sessionActions.setHasConnection(true));
  });

  const initialState = async () => {
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

  const routes = (): JSX.Element[] => {
    const routes: JSX.Element[] = views.map((v) => {
      const viewConfig: AppViewConfig | undefined = configService.getViewConfig({ id: v.id });
      const layoutConfig = layouts.find((l) => l.id === viewConfig?.layout) || layouts[0];
      const componentProps: RouteProps = {
        exact: !!viewConfig?.exact,
        path: viewConfig?.path || '',
        render: (props) =>
          createElement(layoutConfig.component, {
            children: createElement(v.component, { ...props, ...v.componentProps }),
          }),
      };

      return <Route key={v.id} {...componentProps} />;
    });

    return routes;
  };

  const isDev = !envService.isProduction();
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
    const isRootDrive = props.namePath.length === 1;

    if (isRecentsView || isSharedView) {
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
              routes()
            )}
          </Switch>

          <Toaster
            position="bottom-center"
            containerStyle={{
              filter: 'drop-shadow(0 32px 40px rgba(18, 22, 25, 0.08))',
            }}
          />
          {isPreferencesDialogOpen && (
            <PreferencesDialog haveParamsChanged={haveParamsChanged} setHaveParamsChanged={setHaveParamsChanged} />
          )}

          <NewsletterDialog isOpen={isNewsletterDialogOpen} />
          {isSurveyDialogOpen && <SurveyDialog isOpen={isSurveyDialogOpen} />}

          {isFileViewerOpen && fileViewerItem && (
            <FileViewerWrapper file={fileViewerItem} onClose={onCloseFileViewer} showPreview={isFileViewerOpen} />
          )}
        </Router>
      </DndProvider>
    );
  }

  return template;
};

const SharingRedirect = () => {
  const params = useParams();
  const history = useHistory();

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    const sharingId = (params as any).sharingId;
    const action = (params as any).action;
    const redirectURL = `/login?sharingId=${sharingId}&action=${action}&token=${token}`;

    history.push(redirectURL);
  }, [params, history]);

  return null;
};

export default connect((state: RootState) => ({
  isAuthenticated: state.user.isAuthenticated,
  isInitialized: state.user.isInitialized,
  isFileViewerOpen: state.ui.isFileViewerOpen,
  isNewsletterDialogOpen: state.ui.isNewsletterDialogOpen,
  isSurveyDialogOpen: state.ui.isSurveyDialogOpen,
  isPreferencesDialogOpen: state.ui.isPreferencesDialogOpen,
  fileViewerItem: state.ui.fileViewerItem,
  user: state.user.user,
  namePath: state.storage.namePath,
}))(App);
