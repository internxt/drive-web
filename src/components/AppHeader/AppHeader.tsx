import React, { Fragment, ReactNode } from 'react';
import { connect } from 'react-redux';
import { TeamsSettings, UserSettings } from '../../models/interfaces';
import { AppDispatch, RootState } from '../../store';
import * as Unicons from '@iconscout/react-unicons';

import { Dropdown } from 'react-bootstrap';
import { AppView, Workspace } from '../../models/enums';
import { userThunks } from '../../store/slices/user';
import { uiActions } from '../../store/slices/ui';
import { storageActions } from '../../store/slices/storage';
import validationService from '../../services/validation.service';
import { StorageFilters } from '../../store/slices/storage/storage.model';
import { sessionSelectors } from '../../store/slices/session/session.selectors';
import sessionThunks from '../../store/slices/session/session.thunks';
import storageThunks from '../../store/slices/storage/storage.thunks';
import navigationService from '../../services/navigation.service';

interface AppHeaderProps {
  user: UserSettings | undefined;
  team: TeamsSettings | undefined | null;
  workspace: Workspace;
  isTeam: boolean;
  storageFilters: StorageFilters;
  dispatch: AppDispatch;
}

class AppHeader extends React.Component<AppHeaderProps> {
  constructor(props: AppHeaderProps) {
    super(props);
  }

  onSearchButtonClicked = (): void => {
    // TODO: do search
  };

  onAccountButtonClicked = (): void => {
    navigationService.push(AppView.Account);
  };

  onSupportButtonClicked = (): void => {
    window.open('https://help.internxt.com/');
  };

  onChangeWorkspaceButtonClicked = (): void => {
    const { dispatch } = this.props;

    dispatch(sessionThunks.changeWorkspaceThunk());
    dispatch(storageThunks.resetNamePathThunk());
    dispatch(storageThunks.fetchFolderContentThunk());
    dispatch(storageThunks.fetchRecentsThunk());
  };

  onLogoutButtonClicked = (): void => {
    this.props.dispatch(userThunks.logoutThunk());
  };

  onInviteMemberClick = (): void => {
    this.props.dispatch(uiActions.setIsInviteMemberDialogOpen(true));
  };

  onSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (validationService.validateSearchText(e.target.value)) {
      this.props.dispatch(
        storageActions.setFilters({
          text: e.target.value,
        }),
      );
    }
  };

  render(): ReactNode {
    const { user, isTeam, storageFilters, team } = this.props;
    const userFullName: string = user ? `${user.name} ${user.lastname}` : '';
    const nameLetters: string = isTeam
      ? 'B'
      : (user as UserSettings).name[0] + ((user as UserSettings).lastname[0] || '');

    return (
      <div className="flex items-center justify-between w-full py-2.5 border-b border-l-neutral-30 px-8">
        <div className="pl-3 flex w-full">
          <input
            value={storageFilters.text}
            onChange={this.onSearchInputChange}
            type="text"
            placeholder="Search files"
            className="semi-dense w-72 transform duration-200 no-ring bg-l-neutral-10 focus:w-full max-w-xl"
          />
          <Unicons.UilSearch
            onClick={this.onSearchButtonClicked}
            className="text-blue-60 cursor-pointer right-7 relative w-4 top-0.5"
          />
        </div>
        <Dropdown>
          <Dropdown.Toggle id="app-header-dropdown" className="flex">
            <div className="flex items-center cursor-pointer">
              <div className="h-6 w6 rounded-2xl mr-2 bg-l-neutral-20 p-1 flex justify-center items-center text-neutral-700 text-sm">
                {nameLetters}
              </div>
              <span className="hidden md:block text-neutral-500 text-base whitespace-nowrap">
                {isTeam ? 'Business' : userFullName}
              </span>
            </div>
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item id="account" onClick={this.onAccountButtonClicked}>
              <Unicons.UilUserCircle className="h-5 mr-1" />
              <span>Account</span>
            </Dropdown.Item>
            <Dropdown.Item id="info" onClick={this.onSupportButtonClicked}>
              <Unicons.UilChatBubbleUser className="h-5 mr-1" />
              <span>Support</span>
            </Dropdown.Item>
            {team && (
              <Dropdown.Item id="business" onClick={this.onChangeWorkspaceButtonClicked}>
                {!isTeam ? (
                  <Fragment>
                    <Unicons.UilBuilding className="h-5 mr-1" />
                    <span>Business</span>
                  </Fragment>
                ) : (
                  <Fragment>
                    <Unicons.UilUser className="h-5 mr-1" />
                    <span>Personal</span>
                  </Fragment>
                )}
              </Dropdown.Item>
            )}
            {team?.isAdmin && isTeam && (
              <Fragment>
                <hr className="text-l-neutral-30 my-1.5"></hr>
                <Dropdown.Item onClick={this.onInviteMemberClick}>
                  <Unicons.UilUserPlus className="text-blue-60 h-5 mr-1" />
                  <span>Invite members</span>
                </Dropdown.Item>
              </Fragment>
            )}
            <hr className="text-l-neutral-30 my-1.5"></hr>
            <Dropdown.Item id="logout" className="text-red-60 hover:text-red-60" onClick={this.onLogoutButtonClicked}>
              <Unicons.UilSignout className="h-5 mr-1" />
              <span>Log out</span>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
    );
  }
}

export default connect((state: RootState) => {
  const isTeam = sessionSelectors.isTeam(state);

  return {
    user: state.user.user,
    team: state.team.team,
    workspace: state.session.workspace,
    isTeam,
    storageFilters: state.storage.filters,
  };
})(AppHeader);
