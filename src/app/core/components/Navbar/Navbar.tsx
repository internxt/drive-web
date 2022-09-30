import React, { ReactNode } from 'react';
import { connect } from 'react-redux';
import { AppDispatch, RootState } from '../../../store';
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
import { Gear, MagnifyingGlass } from 'phosphor-react';
import AccountPopover from './AccountPopover';
import { PlanState } from '../../../store/slices/plan';
import { Link } from 'react-router-dom';

interface NavbarProps {
  user: UserSettings | undefined;
  team: TeamsSettings | undefined | null;
  workspace: Workspace;
  isTeam: boolean;
  storageFilters: StorageFilters;
  currentFolderId: number;
  dispatch: AppDispatch;
  hideSearch?: boolean;
  plan: PlanState;
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

  render(): ReactNode {
    const { user, storageFilters, hideSearch } = this.props;
    if (!user) throw new Error('User is not defined');

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
        <div className="flex">
          <Link
            to="/preferences"
            className="mr-5 flex h-10 w-10 items-center justify-center rounded-lg text-gray-80 hover:text-gray-80 hover:bg-gray-5 active:bg-gray-10"
          >
            <Gear size={24} />
          </Link>
          <AccountPopover
            className="mr-5 z-40"
            user={user}
            plan={{
              ...this.props.plan,
              showUpgrade:
                (this.props.plan.individualPlan && this.props.plan.individualPlan.name === 'Free Plan') ?? false,
            }}
          />
        </div>
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
    plan: state.plan,
  };
})(Navbar);
