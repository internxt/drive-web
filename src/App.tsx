import { Component, createElement } from 'react';
import { Switch, Route, Redirect, Router } from 'react-router-dom';
import { connect } from 'react-redux';
import { toast, ToastContainer } from 'react-toastify';

import { storeTeamsInfo } from './services/teams.service';
import deviceService from './services/device.service';
import { setCurrentFolderId } from './store/slices/storageSlice';
import { setHasConnection } from './store/slices/networkSlice';
import { AppViewConfig, UserSettings } from './models/interfaces';
import { userActions } from './store/slices/userSlice';
import configService from './services/config.service';
import history from './lib/history';
import analyticsService, { PATH_NAMES } from './services/analytics.service';
import layouts from './layouts';
import views from './views';

import './App.scss';
import { RootState } from './store';
import localStorageService from './services/localStorage.service';
import userService from './services/user.service';

interface AppProps {
  isAuthenticated: boolean;
  isInitialized: boolean;
  user: UserSettings;
  setHasConnection: (value: boolean) => void;
  setUser: (value: UserSettings) => void;
  setCurrentFolderId: (value: number) => void;
  setIsUserInitialized: (value: boolean) => void;
}

interface AppState { }

class App extends Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);

    this.state = {};
  }

  async componentDidMount(): Promise<void> {
    window.addEventListener('offline', () => {
      this.props.setHasConnection(false);
    });
    window.addEventListener('online', () => {
      this.props.setHasConnection(true);
    });

    deviceService.redirectForMobile();

    if (this.props.user && this.props.isAuthenticated) {
      if (!this.props.user.root_folder_id) {
        try {
          const rootFolderId: string = await userService.initializeUser();
        } catch (error) {
          const errorMsg = error ? error : '';

          toast.warn('User initialization error ' + errorMsg);
          history.push('/login');
        }
      } else {
        storeTeamsInfo().finally(() => {
          if (localStorageService.exists('xTeam') && !this.props.user.teams && localStorageService.get('workspace') === 'teams') {
            this.handleChangeWorkspace();
          } else {
            // TODO: load folder content this.getFolderContent(this.props.user.root_folder_id);
            this.props.setCurrentFolderId(this.props.user.root_folder_id);
          }
          const team: any = localStorageService.getTeams();

          if (team && !team.root_folder_id) {
            this.props.setCurrentFolderId(this.props.user.root_folder_id);
          }

          this.props.setIsUserInitialized(true);
        }).catch(() => {
          localStorageService.del('xTeam');
          this.setState({
            isTeam: false
          });
        });
      }
    } else {
      console.log('(App.tsx) user is not authenticated!');
      history.push('/login');
    }
  }

  handleChangeWorkspace = () => {
    const xTeam: any = localStorageService.getTeams();
    const xUser: UserSettings = localStorageService.getUser();

    if (!localStorageService.exists('xTeam')) {
      toast.warn('You cannot access the team');
      this.setState({
        isTeam: false
      });
    }

    if (this.props.user.teams) {
      this.setState({ namePath: [{ name: 'All files', id: xUser.root_folder_id }] }, () => {
        this.getFolderContent(xUser.root_folder_id, false, true, false);
      });
    } else {
      this.setState({ namePath: [{ name: 'All files', id: xTeam.root_folder_id }] }, () => {
        this.getFolderContent(xTeam.root_folder_id, false, true, true);
      });
    }

    const isTeam = !this.props.user.teams;

    this.setState({ isTeam: isTeam }, () => {
      localStorageService.set('workspace', isTeam ? 'teams' : 'individual');
    });
  }

  get routes(): JSX.Element[] {
    const routes: JSX.Element[] = views.map(v => {
      const viewConfig: AppViewConfig | undefined = configService.getViewConfig(v.id);
      const layoutConfig = layouts.find(l => l.id === viewConfig?.layout) || layouts[0];

      return (
        <Route
          key={v.id}
          exact={viewConfig?.exact}
          path={viewConfig?.path}
          render={(props: any) => createElement(
            layoutConfig.component,
            {},
            createElement(
              v.component,
              { ...props, ...v.componentProps }
            )
          )}
        />
      );
    });

    return routes;
  }

  render(): JSX.Element {
    const { isInitialized } = this.props;
    const pathName = window.location.pathname.split('/')[1];

    if (window.location.pathname) {
      if (pathName === 'new' && window.location.search !== '') {
        analyticsService.page(PATH_NAMES[window.location.pathname]);
      }
    }

    if (isInitialized) {
      return (
        <Router history={history}>
          <Switch>
            <Redirect from='//*' to='/*' />
            {this.routes}
            <Route exact path='/'>
              <Redirect to="/login" />
            </Route>
          </Switch>

          {/^[a-z0-9]{10}$/.test(pathName)
            ? <ToastContainer />
            : <ToastContainer
              position="bottom-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick={true}
              rtl={false}
              draggable={true}
              pauseOnHover={true}
              className="" />}
        </Router>
      );
    } else {
      return <div></div>;
    }
  }
}

export default connect((state: RootState) => ({
  isAuthenticated: state.user.isAuthenticated,
  isInitialized: state.user.isInitialized,
  user: state.user.user
}), {
  setHasConnection,
  setUser: userActions.setUser,
  setCurrentFolderId,
  setIsUserInitialized: userActions.setIsUserInitialized
})(App);