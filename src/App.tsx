import { Component, createElement } from 'react';
import { Switch, Route, Redirect, Router, RouteProps } from 'react-router-dom';
import { connect } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { HTML5Backend } from 'react-dnd-html5-backend';
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
import { DriveFileData } from './app/drive/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import views from './app/core/config/views';
import NewsletterDialog from './app/newsletter/components/NewsletterDialog/NewsletterDialog';
import SurveyDialog from 'app/survey/components/SurveyDialog/SurveyDialog';
import PreparingWorkspaceAnimation from './app/auth/components/PreparingWorkspaceAnimation/PreparingWorkspaceAnimation';
import FileViewerWrapper from './app/drive/components/FileViewer/FileViewerWrapper';
import { pdfjs } from 'react-pdf';
import { LRUFilesCacheManager } from './app/database/services/database.service/LRUFilesCacheManager';
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;
import { t } from 'i18next';

interface AppProps {
  isAuthenticated: boolean;
  isInitialized: boolean;
  isFileViewerOpen: boolean;
  isNewsletterDialogOpen: boolean;
  isSurveyDialogOpen: boolean;
  fileViewerItem: DriveFileData | null;
  user: UserSettings | undefined;
  dispatch: AppDispatch;
}

class App extends Component<AppProps> {
  constructor(props: AppProps) {
    super(props);
  }

  async componentDidMount(): Promise<void> {
    const currentRouteConfig: AppViewConfig | undefined = configService.getViewConfig({
      path: navigationService.history.location.pathname,
    });
    const dispatch: AppDispatch = this.props.dispatch;

    window.addEventListener('offline', () => {
      dispatch(sessionActions.setHasConnection(false));
    });
    window.addEventListener('online', () => {
      dispatch(sessionActions.setHasConnection(true));
    });

    await LRUFilesCacheManager.getInstance();

    try {
      await this.props.dispatch(
        initializeUserThunk({
          redirectToLogin: !!currentRouteConfig?.auth,
        }),
      );
    } catch (err: unknown) {
      const castedError = errorService.castError(err);

      console.log(castedError.message);
    }
  }

  get routes(): JSX.Element[] {
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
  }

  render(): JSX.Element {
    const isDev = !envService.isProduction();
    const {
      isInitialized,
      isAuthenticated,
      isFileViewerOpen,
      isNewsletterDialogOpen,
      isSurveyDialogOpen,
      fileViewerItem,
      dispatch,
    } = this.props;
    const pathName = window.location.pathname.split('/')[1];
    let template = <PreparingWorkspaceAnimation />;

    if (window.location.pathname) {
      if ((pathName === 'new' || pathName === 'appsumo') && window.location.search !== '') {
        window.rudderanalytics.page(PATH_NAMES[window.location.pathname]);
        serverPage(PATH_NAMES[window.location.pathname]).catch(() => {
          // NO OP
        });
      }
    }

    if (!isAuthenticated || isInitialized) {
      template = (
        <DndProvider backend={HTML5Backend}>
          <Router history={navigationService.history}>
            {isDev && configService.getAppConfig().debug.enabled && (
              <span
                className="\ \ pointer-events-none absolute top-5 -right-7
               z-50 w-28 rotate-45 transform bg-red-50 px-3.5 py-1 text-center text-supporting-2 font-bold
               tracking-wider text-white opacity-80 drop-shadow-2xl"
              >
                {t('general.stage.development')}
              </span>
            )}

            <Switch>
              <Route exact path="/">
                <Redirect to="/login" />
              </Route>
              <Redirect from="/s/file/:token([a-z0-9]{20})/:code?" to="/sh/file/:token([a-z0-9]{20})/:code?" />
              <Redirect from="/s/folder/:token([a-z0-9]{20})/:code?" to="/sh/folder/:token([a-z0-9]{20})/:code?" />
              <Redirect from="/s/photos/:token([a-z0-9]{20})/:code?" to="/sh/photos/:token([a-z0-9]{20})/:code?" />
              <Redirect from="/account" to="/preferences" />
              {this.routes}
            </Switch>

            <Toaster position="bottom-center" />

            <NewsletterDialog isOpen={isNewsletterDialogOpen} />
            {isSurveyDialogOpen && <SurveyDialog isOpen={isSurveyDialogOpen} />}

            <FileViewerWrapper
              file={fileViewerItem}
              onClose={() => dispatch(uiActions.setIsFileViewerOpen(false))}
              showPreview={isFileViewerOpen}
            />
          </Router>
        </DndProvider>
      );
    }

    return template;
  }
}

export default connect((state: RootState) => ({
  isAuthenticated: state.user.isAuthenticated,
  isInitialized: state.user.isInitialized,
  isFileViewerOpen: state.ui.isFileViewerOpen,
  isNewsletterDialogOpen: state.ui.isNewsletterDialogOpen,
  isSurveyDialogOpen: state.ui.isSurveyDialogOpen,
  fileViewerItem: state.ui.fileViewerItem,
  user: state.user.user,
}))(App);
