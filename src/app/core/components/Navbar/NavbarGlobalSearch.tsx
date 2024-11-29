import { useState, useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import { RootState } from '../../../store';
import { storageSelectors } from '../../../store/slices/storage';
import { sessionSelectors } from '../../../store/slices/session/session.selectors';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { SearchResult } from '@internxt/sdk/dist/drive/storage/types';
import { Gear, MagnifyingGlass, X } from '@phosphor-icons/react';
import AccountPopover from './AccountPopover';
import { PlanState } from '../../../store/slices/plan';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import iconService from 'app/drive/services/icon.service';
import { useHotkeys } from 'react-hotkeys-hook';
import { isMacOs } from 'react-device-detect';
import { SdkFactory } from 'app/core/factory/sdk';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import { uiActions } from 'app/store/slices/ui';
import fileExtensionGroups, { FileExtensionGroup, FileExtensionMap } from 'app/drive/types/file-types';
import NotFoundState from './NotFoundState';
import EmptyState from './EmptyState';
import FilterItem from './FilterItem';
import { getItemPlainName } from 'app/crypto/services/utils';
import navigationService from 'app/core/services/navigation.service';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';

interface NavbarProps {
  user: UserSettings | undefined;
  hideSearch?: boolean;
  plan: PlanState;
}

type FilterType = 'folder' | 'pdf' | 'image' | 'video' | 'audio' | null;

const fileExtension = {
  image: fileExtensionGroups[FileExtensionGroup.Image],
  audio: fileExtensionGroups[FileExtensionGroup.Audio],
  pdf: fileExtensionGroups[FileExtensionGroup.Pdf],
  video: fileExtensionGroups[FileExtensionGroup.Video],
  default: fileExtensionGroups[FileExtensionGroup.Default],
};

const isSelectedType = (extension: string, extensionMap: FileExtensionMap) => {
  for (const fileType in extensionMap) {
    if (extensionMap[fileType].includes(extension.toLowerCase())) {
      return true;
    }
  }
  return false;
};

const Navbar = (props: NavbarProps) => {
  const { translate } = useTranslationContext();
  const { user, hideSearch } = props;
  if (!user) throw new Error('User is not defined');

  const dispatch = useAppDispatch();
  const searchInput = useRef<HTMLInputElement>(null);
  const searchResultList = useRef<HTMLUListElement>(null);
  const [preventBlur, setPreventBlur] = useState<boolean>(false);
  const [openSearchBox, setOpenSearchBox] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterType[]>([]);

  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<number>(0);
  const [loadingSearch, setLoadingSearch] = useState<boolean>(false);
  const [typingTimerID, setTypingTimerID] = useState<NodeJS.Timeout | null>(null);
  const doneTypingInterval = 200;

  const isGlobalSearch = useAppSelector((state: RootState) => state.ui.isGlobalSearch);
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);

  useHotkeys(
    ['Meta+F', 'Control+F'],
    (e) => {
      e.preventDefault();
      if (!hideSearch) {
        searchInput.current?.focus();
      }
    },
    [hideSearch, openSearchBox],
    { enableOnFormTags: ['INPUT'] },
  );

  useEffect(() => {
    if (filters.length > 0) {
      setFilteredResults(filteredSearchResults);
    }
  }, [filters, searchResult]);

  useEffect(() => {
    if (filters.length === 0) {
      setFilteredResults([]);
    }
  }, [filters]);

  useEffect(() => {
    resetGlobalSearch();
  }, [selectedWorkspace]);

  const resetGlobalSearch = () => {
    setQuery('');
    setSelectedResult(0);
    setLoadingSearch(false);
    setSearchResult([]);
  };

  const filteredSearchResults = searchResult.filter((result) => {
    for (const filter of filters) {
      if (filter === 'folder' && result.itemType?.toLowerCase() === 'folder') {
        return true;
      }
      if (result.item.type && isSelectedType(result.item.type, fileExtension[filter || 'default'])) {
        return true;
      }
    }
  });

  const search = async () => {
    const query = searchInput.current?.value ?? '';
    const workspaceId = selectedWorkspace?.workspaceUser.workspaceId;
    if (query.length > 0) {
      const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
      const [itemsPromise] = await storageClient.getGlobalSearchItems(query, workspaceId);
      const items = await itemsPromise;
      const resultItems: SearchResult[] = Array.isArray(items) ? items : items.data;
      setSearchResult(resultItems);
    } else {
      setSearchResult([]);
    }
    searchResultList.current?.scrollTo(0, 0);
    setSelectedResult(0);
    setLoadingSearch(false);
  };

  const openItem = (item) => {
    const itemData = { ...item.item, name: getItemPlainName(item.item), uuid: item.itemId };
    if (item.itemType.toLowerCase() === 'folder') {
      isGlobalSearch && dispatch(storageThunks.resetNamePathThunk());
      dispatch(uiActions.setIsGlobalSearch(true));

      navigationService.pushFolder(itemData.uuid, selectedWorkspace?.workspaceUser.workspaceId);
      searchInput.current?.blur();
      setQuery('');
      setSearchResult([]);
      setOpenSearchBox(false);
      setPreventBlur(false);
    } else {
      navigationService.pushFile(itemData.uuid, selectedWorkspace?.workspaceUser.workspaceId);
    }
  };

  const handleSearch = () => {
    if ((searchInput.current?.value.length ?? 0) > 0) {
      setLoadingSearch(true);
      if (typingTimerID !== null) clearTimeout(typingTimerID);
      const id = setTimeout(() => search(), doneTypingInterval);
      setTypingTimerID(id);
    } else {
      setSearchResult([]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchResult.length > 0) {
      setPreventBlur(false);
      openItem(searchResult[selectedResult]);
    } else {
      setLoadingSearch(true);
      search();
    }
  };

  const handleKeyDown = (e) => {
    let item: number | null = null;
    const lastSearchItemIndex = searchResult.length - 1;

    if (e.key === 'Escape') {
      setPreventBlur(false);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedResult((current) => (current > 0 ? current - 1 : 0));
      item = selectedResult > 0 ? selectedResult - 1 : 0;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedResult((current) => (current < lastSearchItemIndex ? current + 1 : lastSearchItemIndex));
      item = selectedResult < lastSearchItemIndex ? selectedResult + 1 : lastSearchItemIndex;
    }
    if (item) document.querySelector(`#searchResult_${item}`)?.scrollIntoView();
  };

  const filterItems = [
    {
      id: 'folder',
      Icon: iconService.getItemIcon(true),
      name: translate('general.searchBar.filters.folder'),
    },
    {
      id: 'pdf',
      Icon: iconService.getItemIcon(false, 'pdf'),
      name: translate('general.searchBar.filters.pdf'),
    },
    {
      id: 'image',
      Icon: iconService.getItemIcon(false, 'jpg'),
      name: translate('general.searchBar.filters.image'),
    },
    {
      id: 'video',
      Icon: iconService.getItemIcon(false, 'mp4'),
      name: translate('general.searchBar.filters.video'),
    },
    {
      id: 'audio',
      Icon: iconService.getItemIcon(false, 'mp3'),
      name: translate('general.searchBar.filters.audio'),
    },
  ];

  return (
    <div className="flex h-14 w-full items-center justify-between border-b border-gray-5 text-gray-40 dark:bg-gray-1">
      {hideSearch ? (
        <div />
      ) : (
        <form className="relative flex h-full w-full items-center" onSubmitCapture={handleSubmit}>
          <label
            className={`${
              openSearchBox ? 'max-w-screen-sm' : 'max-w-sm'
            } relative flex w-full items-center rounded-lg transition-all duration-150 ease-out`}
            htmlFor="globalSearchInput"
          >
            <MagnifyingGlass
              className="pointer-events-none absolute left-2.5 top-1/2 z-1 -translate-y-1/2 text-gray-60 focus-within:text-gray-80"
              size={20}
            />
            <input
              ref={searchInput}
              id="globalSearchInput"
              data-cy="globalSearchInput"
              autoComplete="off"
              spellCheck="false"
              type="text"
              value={query}
              className="inxt-input left-icon h-10 w-full appearance-none rounded-lg border border-transparent bg-gray-5 px-9 text-lg text-gray-100 placeholder-gray-60 outline-none ring-1 ring-gray-10 transition-all duration-150 ease-out hover:shadow-sm hover:ring-gray-20 focus:border-primary focus:bg-surface focus:placeholder-gray-80 focus:shadow-none focus:ring-3 focus:ring-primary/10 dark:focus:bg-gray-1 dark:focus:ring-primary/20"
              onChange={(e) => {
                setQuery(e.target.value);
                handleSearch();
              }}
              onKeyDownCapture={handleKeyDown}
              onKeyUpCapture={(e) => {
                if (e.key === 'Escape') {
                  e.currentTarget.blur();
                } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                  e.preventDefault();
                }
              }}
              onBlurCapture={(e) => {
                if (preventBlur) {
                  e.currentTarget.focus();
                } else {
                  setOpenSearchBox(false);
                }
              }}
              onFocusCapture={() => setOpenSearchBox(true)}
              placeholder={translate('general.searchBar.placeholder')}
            />
            <div
              className={`${
                openSearchBox && 'opacity-0'
              } pointer-events-none absolute right-2.5 top-1/2 z-1 -translate-y-1/2 rounded-md bg-gray-10 px-2 py-1 text-sm text-gray-50`}
            >
              {isMacOs ? '⌘F' : 'Ctrl F'}
            </div>
            <X
              className={`${
                (query.length === 0 || !openSearchBox) && 'pointer-events-none opacity-0'
              } absolute right-2.5 top-1/2 z-1 -translate-y-1/2 cursor-pointer text-gray-60 transition-all duration-100 ease-out`}
              onMouseDownCapture={() => {
                setQuery('');
                setSearchResult([]);
              }}
              onMouseLeave={() => query.length === 0 && searchInput.current?.focus()}
              size={20}
            />
          </label>

          <div
            className={`${
              openSearchBox
                ? 'translate-y-1.5 scale-100 opacity-100'
                : 'pointer-events-none -translate-y-0.5 scale-98 opacity-0'
            } absolute top-12 z-10 flex h-80 w-full max-w-screen-sm origin-top flex-col overflow-hidden rounded-xl bg-surface text-gray-100 shadow-subtle-hard ring-1 ring-gray-10 transition-all duration-150 ease-out dark:bg-gray-5`}
            onMouseEnter={() => setPreventBlur(true)}
            onMouseLeave={() => setPreventBlur(false)}
          >
            <div className="flex w-full shrink-0 items-center justify-between border-b border-gray-5 px-2.5 py-2.5 dark:border-gray-10">
              <button type="button" className="flex items-center space-x-2">
                {filterItems.map((item) => (
                  <FilterItem
                    key={item.id}
                    id={item.id}
                    Icon={item.Icon}
                    name={item.name}
                    filters={filters}
                    setFilters={setFilters}
                  />
                ))}
              </button>

              <button
                type="button"
                className={`${
                  filters.length === 0 && 'pointer-events-none opacity-0'
                } flex h-8 cursor-pointer items-center space-x-2 rounded-full bg-gray-1 px-3 text-sm font-medium text-gray-60 transition-all duration-100 ease-out hover:bg-gray-5 dark:hover:bg-surface`}
                onClick={() => setFilters([])}
              >
                {translate('general.searchBar.filters.clear')}
              </button>
            </div>

            {(filters.length === 0 && searchResult.length > 0) || (filters.length > 0 && filteredResults.length > 0) ? (
              <ul ref={searchResultList} className="flex h-full flex-col overflow-y-auto pb-4">
                {(filteredResults.length > 0 ? filteredResults : searchResult).map((item, index) => {
                  const isFolder = item.itemType === 'FOLDER' || item.itemType === 'folder';
                  const Icon = iconService.getItemIcon(isFolder, item.item.type);
                  return (
                    <li
                      key={item.id}
                      id={`searchResult_${item.id}`}
                      role="option"
                      aria-selected={selectedResult === index}
                      className={`${
                        selectedResult === index && 'bg-gray-5 dark:bg-gray-10'
                      } flex h-11 shrink-0 cursor-pointer items-center space-x-2.5 px-4 text-gray-100`}
                      onMouseEnter={() => setSelectedResult(index)}
                      onClickCapture={() => openItem(item)}
                    >
                      <Icon className="h-7 w-7 drop-shadow-soft" />
                      <p className="w-full overflow-hidden text-ellipsis whitespace-nowrap">{item.name}</p>
                    </li>
                  );
                })}
              </ul>
            ) : query.length > 0 && !loadingSearch ? (
              <NotFoundState />
            ) : (
              <EmptyState />
            )}
          </div>
        </form>
      )}

      <div className="flex shrink-0">
        <button
          onClick={() => {
            navigationService.openPreferencesDialog({
              section: 'general',
              subsection: 'general',
              workspaceUuid: selectedWorkspace?.workspaceUser.workspaceId,
            });
            dispatch(uiActions.setIsPreferencesDialogOpen(true));
          }}
          className="mr-5 flex h-10 w-10 items-center justify-center rounded-lg text-gray-80 hover:bg-gray-5 hover:text-gray-80 active:bg-gray-10"
        >
          <Gear size={24} />
        </button>
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
    workspace: state.session.workspace,
    isTeam,
    storageFilters: state.storage.filters,
    currentFolderId: storageSelectors.currentFolderId(state),
    plan: state.plan,
  };
})(Navbar);
