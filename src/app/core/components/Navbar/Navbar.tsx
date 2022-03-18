import React, { Fragment, ReactNode } from 'react';
import { connect } from 'react-redux';
import { AppDispatch, RootState } from '../../../store';
import UilUserCircle from '@iconscout/react-unicons/icons/uil-user-circle';
import UilUserPlus from '@iconscout/react-unicons/icons/uil-user-plus';
import UilChatBubbleUser from '@iconscout/react-unicons/icons/uil-chat-bubble-user';
import UilBuilding from '@iconscout/react-unicons/icons/uil-building';
import UilUser from '@iconscout/react-unicons/icons/uil-user';
import UilSignout from '@iconscout/react-unicons/icons/uil-signout';

import { Dropdown } from 'react-bootstrap';
import { userSelectors, userThunks } from '../../../store/slices/user';
import { uiActions } from '../../../store/slices/ui';
import { storageActions, storageSelectors } from '../../../store/slices/storage';
import validationService from '../../services/validation.service';
import { StorageFilters } from '../../../store/slices/storage/storage.model';
import { sessionSelectors } from '../../../store/slices/session/session.selectors';
import sessionThunks from '../../../store/slices/session/session.thunks';
import storageThunks from '../../../store/slices/storage/storage.thunks';
import navigationService from '../../services/navigation.service';
import { AppView, Workspace } from '../../types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { TeamsSettings } from '../../../teams/types';
import { MagnifyingGlass } from 'phosphor-react';

interface NavbarProps {
  user: UserSettings | undefined;
  nameLetters: string;
  team: TeamsSettings | undefined | null;
  workspace: Workspace;
  isTeam: boolean;
  storageFilters: StorageFilters;
  currentFolderId: number;
  dispatch: AppDispatch;
}

class Navbar extends React.Component<NavbarProps> {
  constructor(props: NavbarProps) {
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
    const { dispatch, currentFolderId } = this.props;

    dispatch(sessionThunks.changeWorkspaceThunk());
    dispatch(storageThunks.resetNamePathThunk());
    dispatch(storageThunks.fetchFolderContentThunk(currentFolderId));
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

  onGuestInviteCliked = (): void => {
    this.props.dispatch(uiActions.setIsGuestInvitationDialogOpen(true));
  };

  render(): ReactNode {
    const { user, isTeam, storageFilters, team, nameLetters } = this.props;
    const userFullName: string = user ? `${user.name} ${user.lastname}` : '';

    return (
      <div className="flex items-center justify-between w-full h-14 border-b border-neutral-30 text-gray-40">
        <div className="flex">
          <input
            value={storageFilters.text}
            onChange={this.onSearchInputChange}
            type="text"
            placeholder="Search in this folder"
            className="right-icon h-9 px-3 w-80 transform duration-200 no-ring bg-gray-5 focus:w-full max-w-md"
          />
          <MagnifyingGlass
            onClick={this.onSearchButtonClicked}
            className="cursor-pointer right-7 relative top-2.5"
            size={16}
          />
        </div>
        <Dropdown>
          <Dropdown.Toggle id="app-header-dropdown" className="flex">
            <div className="flex items-center cursor-pointer">
              <div
                className="h-6 w6 rounded-2xl mr-2 bg-neutral-20 \
              p-1 flex justify-center items-center text-neutral-700 text-sm"
              >
                {nameLetters}
              </div>
              <span className="hidden md:block text-neutral-500 text-base whitespace-nowrap">
                {isTeam ? 'Business' : userFullName}
              </span>
            </div>
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item id="account" onClick={this.onAccountButtonClicked}>
              <UilUserCircle className="h-5 mr-1" />
              <span>Account</span>
            </Dropdown.Item>
            {user && user.sharedWorkspace && (
              <Dropdown.Item id="guest-invite" onClick={this.onGuestInviteCliked}>
                <UilUserPlus className="text-blue-60 h-5 mr-1" />
                <span>Guest</span>
              </Dropdown.Item>
            )}
            <Dropdown.Item id="info" onClick={this.onSupportButtonClicked}>
              <UilChatBubbleUser className="h-5 mr-1" />
              <span>Support</span>
            </Dropdown.Item>
            {team && (
              <Dropdown.Item id="business" onClick={this.onChangeWorkspaceButtonClicked}>
                {!isTeam ? (
                  <Fragment>
                    <UilBuilding className="h-5 mr-1" />
                    <span>Business</span>
                  </Fragment>
                ) : (
                  <Fragment>
                    <UilUser className="h-5 mr-1" />
                    <span>Personal</span>
                  </Fragment>
                )}
              </Dropdown.Item>
            )}
            {team?.isAdmin && isTeam && (
              <Fragment>
                <hr className="text-neutral-30 my-1.5"></hr>
                <Dropdown.Item onClick={this.onInviteMemberClick}>
                  <UilUserPlus className="text-blue-60 h-5 mr-1" />
                  <span>Invite members</span>
                </Dropdown.Item>
              </Fragment>
            )}
            <hr className="text-neutral-30 my-1.5"></hr>
            <Dropdown.Item id="logout" className="text-red-60 hover:text-red-60" onClick={this.onLogoutButtonClicked}>
              <UilSignout className="h-5 mr-1" />
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
    nameLetters: userSelectors.nameLetters(state),
    team: state.team.team,
    workspace: state.session.workspace,
    isTeam,
    storageFilters: state.storage.filters,
    currentFolderId: storageSelectors.currentFolderId(state),
  };
})(Navbar);
