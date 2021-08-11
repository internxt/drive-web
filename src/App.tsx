import { Component, createElement } from 'react';
import { Switch, Route, Redirect, Router } from 'react-router-dom';
import { connect } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { DndProvider } from 'react-dnd';

import { initializeUserThunk } from './store/slices/user';
import { setHasConnection } from './store/slices/network';
import { AppViewConfig, UserSettings } from './models/interfaces';
import configService from './services/config.service';
import analyticsService, { PATH_NAMES } from './services/analytics.service';
import layouts from './layouts';
import views from './views';
import history from './lib/history';
import { AppDispatch, RootState } from './store';

interface AppProps {
  isAuthenticated: boolean;
  isInitialized: boolean;
  user: UserSettings | undefined;
  dispatch: AppDispatch;
}

interface AppState { }

class App extends Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);

    this.state = {};
  }

  async componentDidMount(): Promise<void> {
    const currentRouteConfig: AppViewConfig | undefined = configService.getViewConfig({ path: history.location.pathname });
    const dispatch: AppDispatch = this.props.dispatch;

    window.addEventListener('offline', () => {
      dispatch(setHasConnection(false));
    });
    window.addEventListener('online', () => {
      dispatch(setHasConnection(true));
    });

    try {
      await this.props.dispatch(initializeUserThunk({
        redirectToLogin: !!currentRouteConfig?.auth
      }));
    } catch (e) {
      console.log(e);
    }
  }

  get routes(): JSX.Element[] {
    const routes: JSX.Element[] = views.map(v => {
      const viewConfig: AppViewConfig | undefined = configService.getViewConfig({ id: v.id });
      const layoutConfig = layouts.find(l => l.id === viewConfig?.layout) || layouts[0];
      const componentProps: {
        key: string, exact: boolean; path: string; render: any
      } = {
        key: v.id,
        exact: !!viewConfig?.exact,
        path: viewConfig?.path || '',
        render: (props: any) => createElement(
          layoutConfig.component,
          {},
          createElement(
            v.component,
            { ...props, ...v.componentProps }
          )
        )
      };

      return (
        <Route
          {...componentProps}
        />
      );
    });

    return routes;
  }

  render(): JSX.Element {
    const { isInitialized, isAuthenticated } = this.props;
    const pathName = window.location.pathname.split('/')[1];
    let template: JSX.Element = <div></div>;

    if (window.location.pathname) {
      if (pathName === 'new' && window.location.search !== '') {
        analyticsService.page(PATH_NAMES[window.location.pathname]);
      }
    }

    if (!isAuthenticated || isInitialized) {
      template = (
        <DndProvider backend={HTML5Backend}>
          <Router history={history}>
            <Switch>
              <Redirect from='//*' to='/*' />
              <Route exact path='/'>
                <Redirect to="/login" />
              </Route>
              {this.routes}
            </Switch>

            <ToastContainer />
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
  user: state.user.user
}))(App);