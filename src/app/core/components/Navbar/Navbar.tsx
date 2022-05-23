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
import { userThunks } from '../../../store/slices/user';
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
import Avatar from '../../../shared/components/Avatar';

interface NavbarProps {
  user: UserSettings | undefined;
  team: TeamsSettings | undefined | null;
  workspace: Workspace;
  isTeam: boolean;
  storageFilters: StorageFilters;
  currentFolderId: number;
  dispatch: AppDispatch;
  hideSearch?: boolean;
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
    const { user, isTeam, storageFilters, team, hideSearch } = this.props;
    if (!user) throw new Error('User is not defined');

    const userFullName = `${user.name} ${user.lastname}`;

    return (
      <div className="flex h-14 w-full items-center justify-between border-b border-neutral-30 text-gray-40">
        {hideSearch ? (
          <div />
        ) : (
          <div className="flex">
            <input
              value={storageFilters.text}
              onChange={this.onSearchInputChange}
              type="text"
              placeholder="Search in this folder"
              className="no-ring-at-all h-9 w-80 max-w-md transform bg-gray-5 px-3 duration-200 focus:w-full focus:ring-0"
            />
            <MagnifyingGlass
              onClick={this.onSearchButtonClicked}
              className="relative right-7 top-2.5 cursor-pointer"
              size={16}
            />
          </div>
        )}
        <Dropdown>
          <Dropdown.Toggle id="app-header-dropdown" className="flex">
            <div className="flex cursor-pointer items-center pr-5">
              <Avatar fullName={userFullName} src={user.avatar} diameter={36} />
              <span className="ml-3 hidden whitespace-nowrap font-medium tracking-wide text-gray-80 md:block">
                {isTeam ? 'Business' : userFullName}
              </span>
            </div>
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item id="account" onClick={this.onAccountButtonClicked}>
              <UilUserCircle className="mr-1 h-5" />
              <span>Account</span>
            </Dropdown.Item>
            {user && user.sharedWorkspace && (
              <Dropdown.Item id="guest-invite" onClick={this.onGuestInviteCliked}>
                <UilUserPlus className="mr-1 h-5 text-blue-60" />
                <span>Guest</span>
              </Dropdown.Item>
            )}
            <Dropdown.Item id="info" onClick={this.onSupportButtonClicked}>
              <UilChatBubbleUser className="mr-1 h-5" />
              <span>Support</span>
            </Dropdown.Item>
            {team && (
              <Dropdown.Item id="business" onClick={this.onChangeWorkspaceButtonClicked}>
                {!isTeam ? (
                  <Fragment>
                    <UilBuilding className="mr-1 h-5" />
                    <span>Business</span>
                  </Fragment>
                ) : (
                  <Fragment>
                    <UilUser className="mr-1 h-5" />
                    <span>Personal</span>
                  </Fragment>
                )}
              </Dropdown.Item>
            )}
            {team?.isAdmin && isTeam && (
              <Fragment>
                <hr className="my-1.5 text-neutral-30"></hr>
                <Dropdown.Item onClick={this.onInviteMemberClick}>
                  <UilUserPlus className="mr-1 h-5 text-blue-60" />
                  <span>Invite members</span>
                </Dropdown.Item>
              </Fragment>
            )}
            <hr className="my-1.5 text-neutral-30"></hr>
            <Dropdown.Item id="logout" className="text-red-60 hover:text-red-60" onClick={this.onLogoutButtonClicked}>
              <UilSignout className="mr-1 h-5" />
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
    currentFolderId: storageSelectors.currentFolderId(state),
  };
})(Navbar);
