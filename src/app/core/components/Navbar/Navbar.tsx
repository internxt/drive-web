import React from 'react';
import { connect } from 'react-redux';
import { AppDispatch, RootState } from '../../../store';
import { storageActions, storageSelectors } from '../../../store/slices/storage';
import validationService from '../../services/validation.service';
import { StorageFilters } from '../../../store/slices/storage/storage.model';
import { sessionSelectors } from '../../../store/slices/session/session.selectors';
import { Workspace } from '../../types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { TeamsSettings } from '../../../teams/types';
import { Gear, MagnifyingGlass } from '@phosphor-icons/react';
import AccountPopover from './AccountPopover';
import { PlanState } from '../../../store/slices/plan';
import { Link } from 'react-router-dom';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

interface NavbarProps {
  user: UserSettings | undefined;
  team: TeamsSettings | undefined | null;
  workspace: Workspace;
  isTeam: boolean;
  storageFilters: StorageFilters;
  currentFolderId: string;
  dispatch: AppDispatch;
  hideSearch?: boolean;
  plan: PlanState;
}

const Navbar = (props: NavbarProps) => {
  const { translate } = useTranslationContext();

  const onSearchButtonClicked = (): void => {
    // TODO: do search
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
    <div className="flex h-14 w-full items-center justify-between border-b border-gray-5 text-gray-40 dark:bg-gray-1">
      {hideSearch ? (
        <div />
      ) : (
        <div className="flex">
          <input
            value={storageFilters.text}
            onChange={onSearchInputChange}
            type="text"
            placeholder={translate('general.searchBar.oldSearchBarPlaceholder') as string}
            className="no-ring-at-all h-9 w-80 max-w-md bg-gray-5 px-3 duration-200 focus:ring-0"
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
