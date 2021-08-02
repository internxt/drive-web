import React, { Fragment, ReactNode } from 'react';
import { connect } from 'react-redux';
import { TeamsSettings, UserSettings } from '../../models/interfaces';
import { RootState } from '../../store';
import history from '../../lib/history';
import * as Unicons from '@iconscout/react-unicons';

import './AppHeader.scss';
import { Dropdown } from 'react-bootstrap';
import authService from '../../services/auth.service';
import { Workspace } from '../../models/enums';
import { handleChangeWorkspaceThunk } from '../../store/slices/user';
import { loadDataAtChangeWorkspace } from '../../services/workspace.service';
import localStorageService from '../../services/localStorage.service';
import { filesStateSlice } from '../../store/slices/files';
import { setWorkspace } from '../../store/slices/team';

interface AppHeaderProps {
  user: UserSettings | undefined
  team: TeamsSettings | undefined
  workspace: Workspace
}

interface AppHeaderState { }

class AppHeader extends React.Component<AppHeaderProps, AppHeaderState> {
  constructor(props: AppHeaderProps) {
    super(props);

    this.state = {};

    this.onAccountButtonClicked = this.onAccountButtonClicked.bind(this);
    this.onSearchButtonClicked = this.onSearchButtonClicked.bind(this);
  }

  onSearchButtonClicked(): void {
    console.log('search submitted!');
  }

  onAccountButtonClicked = (): void => {
    history.push('/account');
  }

  onSupportButtonClicked = (): void => {
    window.open('https://help.internxt.com/');
  }

  onBusinesButtonClicked = (): void => {
    const { dispatch } = this.props;

    dispatch(
      handleChangeWorkspaceThunk()
    ).then(() => {
      loadDataAtChangeWorkspace(dispatch, this.props.workspace);
    });
  }

  onLogoutButtonClicked = (): void => {
    this.props.dispatch(filesStateSlice.actions.clearFileLoggerStatus());
    this.props.dispatch(setWorkspace(Workspace.Personal));
    authService.logOut();
  }

  render(): ReactNode {
    const { user, workspace } = this.props;
    const userFullName: string = user ? `${user.name} ${user.lastname}` : '';
    const team = localStorageService.exists('xTeam');

    return (
      <div className="flex justify-between w-full py-3 mb-2">
        <div className="flex">
          <input type="text" placeholder="Search files" className="no-ring right-icon" />
          <Unicons.UilSearch onClick={this.onSearchButtonClicked} className="text-blue-60 cursor-pointer right-6 relative w-4 h-full" />
        </div>
        <Dropdown>
          <Dropdown.Toggle id="app-header-dropdown" className="flex">
            <div className="flex items-center cursor-pointer">
              {workspace === Workspace.Personal ?
                <Fragment>
                  <Unicons.UilUser className="user-avatar rounded-2xl mr-1 bg-l-neutral-30 p-0.5 text-blue-60" />
                  <span className="text-neutral-500 text-sm">{userFullName}</span>
                </Fragment>
                :
                <Fragment>
                  <Unicons.UilBuilding className="user-avatar rounded-2xl mr-1 bg-l-neutral-30 p-0.5 text-blue-60" />
                  <span className="text-neutral-500 text-sm">Business</span>
                </Fragment>
              }
            </div>
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item
              id="account"
              onClick={this.onAccountButtonClicked}
            >
              <Unicons.UilUserCircle className="text-blue-60 h-5 mr-1" />
              <span>Account</span>
            </Dropdown.Item>
            <Dropdown.Item
              id="info"
              onClick={this.onSupportButtonClicked}
            >
              <Unicons.UilChatBubbleUser className="text-blue-60 h-5 mr-1" />
              <span>Support</span>
            </Dropdown.Item>
            {
              team &&
                (<Dropdown.Item
                  id="business"
                  onClick={this.onBusinesButtonClicked}
                >
                  {workspace === Workspace.Personal ?
                    <Fragment>
                      <Unicons.UilBuilding className="text-blue-60 h-5 mr-1" />
                      <span>Business</span>
                    </Fragment>

                    :
                    <Fragment>
                      <Unicons.UilUser className="text-blue-60 h-5 mr-1" />
                      <span>Personal</span>
                    </Fragment>

                  }
                </Dropdown.Item>)
            }
            <hr className="text-l-neutral-30 my-1.5"></hr>
            {this.props.team?.isAdmin && workspace === Workspace.Business &&
              <Dropdown.Item>
                <Unicons.UilUserPlus className="text-blue-60 h-5 mr-1" />
                <span>Invite a memeber</span>
              </Dropdown.Item>
            }
            <Dropdown.Item
              id="logout"
              className="text-red-60 hover:text-red-60"
              onClick={this.onLogoutButtonClicked}
            >
              <Unicons.UilSignout className="h-5 mr-1" />
              <span>Log out</span>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
    );
  }
}

export default connect((state: RootState) => ({
  user: state.user.user,
  team: state.team.team,
  workspace: state.team.workspace
}))(AppHeader);