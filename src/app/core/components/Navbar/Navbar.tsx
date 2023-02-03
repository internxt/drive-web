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
import { useTranslation } from 'react-i18next';

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

const Navbar = (props: NavbarProps) => {
  const { t } = useTranslation();
  const onSearchButtonClicked = (): void => {
    // TODO: do search
  };

  const onSupportButtonClicked = (): void => {
    window.open('https://help.internxt.com/');
  };

  const onChangeWorkspaceButtonClicked = (): void => {
    const { dispatch, currentFolderId } = props;

    dispatch(sessionThunks.changeWorkspaceThunk());
    dispatch(storageThunks.resetNamePathThunk());
    dispatch(storageThunks.fetchFolderContentThunk(currentFolderId));
    dispatch(storageThunks.fetchRecentsThunk());
  };

  const onLogoutButtonClicked = (): void => {
    props.dispatch(userThunks.logoutThunk());
  };

  const onInviteMemberClick = (): void => {
    props.dispatch(uiActions.setIsInviteMemberDialogOpen(true));
  };

  const onSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (validationService.validateSearchText(e.target.value)) {
      props.dispatch(
        storageActions.setFilters({
          text: e.target.value,
        }),
      );
    }
  };

  const { user, storageFilters, hideSearch } = props;
  if (!user) throw new Error('User is not defined');

  return (
    <div className="flex h-14 w-full items-center justify-between border-b border-neutral-30 text-gray-40">
      {hideSearch ? (
        <div />
      ) : (
        <div className="flex">
          <input
            value={storageFilters.text}
            onChange={onSearchInputChange}
            type="text"
            placeholder={t('general.searchBar') as string}
            className="no-ring-at-all h-9 w-80 max-w-md transform bg-gray-5 px-3 duration-200 focus:w-full focus:ring-0"
          />
          <MagnifyingGlass
            onClick={onSearchButtonClicked}
            className="relative right-7 top-2.5 cursor-pointer"
            size={16}
          />
        </div>
      )}
      <div className="flex">
        <Link
          to="/preferences"
          className="mr-5 flex h-10 w-10 items-center justify-center rounded-lg text-gray-80 hover:bg-gray-5 hover:text-gray-80 active:bg-gray-10"
        >
          <Gear size={24} />
        </Link>
        <AccountPopover
          className="z-40 mr-5"
          user={user}
          plan={{
            ...props.plan,
            showUpgrade: (props.plan.individualPlan && props.plan.individualPlan.name === 'Free Plan') ?? false,
          }}
        />
      </div>
    </div>
  );
};

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
