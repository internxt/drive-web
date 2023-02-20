import React, { useState, Fragment } from 'react';
import { connect } from 'react-redux';
import { AppDispatch, RootState } from '../../../store';
import { storageActions, storageSelectors } from '../../../store/slices/storage';
import validationService from '../../services/validation.service';
import { StorageFilters } from '../../../store/slices/storage/storage.model';
import { sessionSelectors } from '../../../store/slices/session/session.selectors';
import { Workspace } from '../../types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { TeamsSettings } from '../../../teams/types';
import { Gear, MagnifyingGlass } from 'phosphor-react';
import AccountPopover from './AccountPopover';
import { PlanState } from '../../../store/slices/plan';
import { Link } from 'react-router-dom';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { Combobox, Transition } from '@headlessui/react';
import iconService from 'app/drive/services/icon.service';
import { SdkFactory } from '../../../core/factory/sdk';

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

const PhotoIcon = iconService.getItemIcon(false, 'jpg');
const PdfIcon = iconService.getItemIcon(false, 'pdf');
const FolderIcon = iconService.getItemIcon(true);
const AudioIcon = iconService.getItemIcon(false, 'mp3');
const VideoIcon = iconService.getItemIcon(false, 'avi');

const Navbar = (props: NavbarProps) => {
  const { translate } = useTranslationContext();

  // const onSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
  //   if (validationService.validateSearchText(e.target.value)) {
  //     props.dispatch(
  //       storageActions.setFilters({
  //         text: e.target.value,
  //       }),
  //     );
  //   }
  // };

  const { user, storageFilters, hideSearch } = props;
  if (!user) throw new Error('User is not defined');

  const [query, setQuery] = useState('');

  return (
    <div className="flex h-14 w-full items-center justify-between border-b border-neutral-30 text-gray-40">
      {hideSearch ? (
        <div />
      ) : (
        <div className="flex w-full">
          <Combobox value={query}>
            <Combobox.Button as="div" className="relative w-full">
              <Combobox.Button className="absolute inset-y-0 left-2.5 z-10 text-gray-40">
                <MagnifyingGlass className="relative" size={20} />
              </Combobox.Button>
              <Combobox.Input
                className="no-ring navbar-search left-icon h-9 w-80 max-w-screen-md transform bg-gray-5 duration-200 focus:w-full focus:border-blue-60 focus:bg-white"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={translate('general.searchBar') as string}
              />
            </Combobox.Button>
            <Transition
              as={Fragment}
              enter="transition transform ease-out duration-150"
              enterFrom="-translate-y-0.5 opacity-0"
              enterTo="translate-y-0 opacity-100"
              leave="transition transform ease-out duration-150"
              leaveFrom="translate-y-0 opacity-100"
              leaveTo="-translate-y-0.5 opacity-0"
            >
              <Combobox.Options
                className={
                  'absolute top-12 z-10 mt-1 h-80 w-full max-w-screen-md rounded-md border border-gray-10 bg-white'
                }
              >
                <div className="flex border-b border-gray-5 p-3">
                  <Combobox.Option
                    className="mr-1.5 flex items-center rounded-full border border-gray-10 px-3 py-1.5 font-normal text-gray-60"
                    key={'folders'}
                    value={'folders'}
                  >
                    <FolderIcon className="mr-1.5 h-5 w-5" />
                    {'Folders'}
                  </Combobox.Option>
                  <Combobox.Option
                    className="mr-1.5 flex items-center rounded-full border border-gray-10 px-3 py-1.5 font-normal text-gray-60"
                    key={'pdf'}
                    value={'pdf'}
                  >
                    <PdfIcon className="mr-1.5 h-5 w-5" />
                    {'PDFs'}
                  </Combobox.Option>
                  <Combobox.Option
                    className="mr-1.5 flex items-center rounded-full border border-gray-10 px-3 py-1.5 font-normal text-gray-60"
                    key={'images'}
                    value={'images'}
                  >
                    <PhotoIcon className="mr-1.5 h-5 w-5" />
                    {'Photos and images'}
                  </Combobox.Option>
                  <Combobox.Option
                    className="mr-1.5 flex items-center rounded-full border border-gray-10 px-3 py-1.5 font-normal text-gray-60"
                    key={'videos'}
                    value={'videos'}
                  >
                    <VideoIcon className="mr-1.5 h-5 w-5" />
                    {'Videos'}
                  </Combobox.Option>
                  <Combobox.Option
                    className="mr-1.5 flex items-center rounded-full border border-gray-10 px-3 py-1.5 font-normal text-gray-60"
                    key={'audio'}
                    value={'audio'}
                  >
                    <AudioIcon className="mr-1.5 h-5 w-5" />
                    {'Audio'}
                  </Combobox.Option>
                </div>
                {/* EMPTY */}
                <div className="flex h-4/6 flex-col items-center justify-center">
                  <div className="relative h-20 w-28">
                    <FolderIcon className="absolute top-0 left-11 h-16 w-16 rotate-10 transform drop-shadow-soft filter" />
                    <PdfIcon className="absolute top-0 left-2 h-16 w-16 rotate-10- transform drop-shadow-soft filter" />
                  </div>
                  <p className="text-xl font-medium text-gray-100">Find files and folders</p>
                  <p className="text-sm font-normal text-gray-60">Search by name and type</p>
                </div>
              </Combobox.Options>
            </Transition>
          </Combobox>
        </div>
        // <div className="flex">
        //   <input
        //     value={storageFilters.text}
        //     onChange={onSearchInputChange}
        //     type="text"
        //     placeholder={translate('general.searchBar') as string}
        //     className="no-ring-at-all h-9 w-80 max-w-md transform bg-gray-5 px-3 duration-200 focus:w-full focus:ring-0"
        //   />
        //   <MagnifyingGlass
        //     className="relative right-7 top-2.5 cursor-pointer"
        //     size={16}
        //   />
        // </div>
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
