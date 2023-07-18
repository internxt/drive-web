import { useState, useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import { AppDispatch, RootState } from '../../../store';
import { storageSelectors } from '../../../store/slices/storage';
import { StorageFilters } from '../../../store/slices/storage/storage.model';
import { sessionSelectors } from '../../../store/slices/session/session.selectors';
import { Workspace } from '../../types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { TeamsSettings } from '../../../teams/types';
import { Binoculars, Gear, MagnifyingGlass, X } from '@phosphor-icons/react';
import AccountPopover from './AccountPopover';
import { PlanState } from '../../../store/slices/plan';
import { Link } from 'react-router-dom';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import iconService from 'app/drive/services/icon.service';
import { useHotkeys } from 'react-hotkeys-hook';
import { isMacOs } from 'react-device-detect';

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

interface SearchResult {
  name: string;
  type: string;
  id: string;
}

type FilterType = 'folder' | 'pdf' | 'image' | 'video' | 'audio' | null;

const Navbar = (props: NavbarProps) => {
  const { translate } = useTranslationContext();
  const { user, hideSearch } = props;
  if (!user) throw new Error('User is not defined');

  const searchInput = useRef<HTMLInputElement>(null);
  const searchResultList = useRef<HTMLUListElement>(null);
  const [preventBlur, setPreventBlur] = useState<boolean>(false);
  const [openSeachBox, setOpenSeachBox] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterType[]>([]);

  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<number>(0);
  const [loadingSearch, setLoadingSearch] = useState<boolean>(false);
  const [typingTimerID, setTypingTimerID] = useState<NodeJS.Timeout | null>(null);
  const doneTypingInterval = 200;

  const PdfIcon = iconService.getItemIcon(false, 'pdf');
  const FolderIcon = iconService.getItemIcon(true);

  useHotkeys(
    ['Meta+F', 'Control+F'],
    (e) => {
      e.preventDefault();
      if (!hideSearch) {
        searchInput.current?.focus();
      }
    },
    [hideSearch, openSeachBox],
    { enableOnFormTags: ['INPUT'] },
  );

  useEffect(() => {
    search();
  }, [filters]);

  // TODO -> Add the function to search
  const search = async () => {
    const query = searchInput.current?.value ?? '';
    if (query.length > 0) {
      //! setSearchResult of the real results
      setSearchResult([
        { name: 'Test folder 1', type: 'folder', id: '1' },
        { name: 'Test file 2', type: 'pdf', id: '2' },
        { name: 'Test file 3', type: 'pdf', id: '3' },
        { name: 'Test file 4', type: 'pdf', id: '4' },
        { name: 'Test file 5', type: 'pdf', id: '5' },
        { name: 'Test file 6', type: 'pdf', id: '6' },
        { name: 'Test file 7', type: 'pdf', id: '7' },
        { name: 'Test file 8', type: 'pdf', id: '8' },
        { name: 'Test file 9', type: 'pdf', id: '9' },
        { name: 'Test file 10', type: 'pdf', id: '10' },
      ]);
    } else {
      setSearchResult([]);
    }
    searchResultList.current?.scrollTo(0, 0);
    setSelectedResult(0);
    setLoadingSearch(false);
  };

  const toggleFilter = (filter: FilterType) => {
    if (filters.includes(filter)) {
      setFilters((currentFilters) => currentFilters.filter((currentFilter) => currentFilter !== filter));
    } else {
      setFilters((currentFilters) => [...currentFilters, filter]);
    }
  };

  const openItem = (id: string) => {
    searchInput.current?.blur();
    // TODO -> Open file/folder by id
    // Open file/folder in the same tab
    alert(`Open item with ID ${id}`);
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
      openItem(searchResult[selectedResult].id);
    } else {
      setLoadingSearch(true);
      search();
    }
  };

  const handleKeyDown = (e) => {
    let item: number | null = null;
    if (e.key === 'Escape') {
      setPreventBlur(false);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedResult((current) => (current > 0 ? current - 1 : 0));
      item = selectedResult > 0 ? selectedResult - 1 : 0;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedResult((current) => (current < searchResult.length - 1 ? current + 1 : searchResult.length - 1));
      item = selectedResult < searchResult.length - 1 ? selectedResult + 1 : searchResult.length - 1;
    }
    if (item) document.querySelector(`#searchResult_${item}`)?.scrollIntoView();
  };

  const FilterItem = ({ id, Icon, name }) => (
    <div
      className={`${
        filters.includes(id)
          ? 'bg-primary bg-opacity-10 text-primary ring-primary ring-opacity-20'
          : 'bg-white text-gray-80 ring-gray-10 hover:bg-gray-1 hover:shadow-sm hover:ring-gray-20 active:bg-gray-5 active:ring-gray-30'
      } flex h-8 cursor-pointer items-center space-x-2 rounded-full px-3 font-medium shadow-sm ring-1 transition-all duration-100 ease-out`}
      onClick={() => toggleFilter(id)}
    >
      <Icon className="h-5 w-5 drop-shadow-sm filter" />
      <span className="text-sm">{name}</span>
    </div>
  );

  const filterItems = [
    {
      id: 'folder',
      Icon: iconService.getItemIcon(true),
      name: translate('general.searchBar.filters.folder') as string,
    },
    {
      id: 'pdf',
      Icon: iconService.getItemIcon(false, 'pdf'),
      name: translate('general.searchBar.filters.pdf') as string,
    },
    {
      id: 'image',
      Icon: iconService.getItemIcon(false, 'jpg'),
      name: translate('general.searchBar.filters.image') as string,
    },
    {
      id: 'video',
      Icon: iconService.getItemIcon(false, 'mp4'),
      name: translate('general.searchBar.filters.video') as string,
    },
    {
      id: 'audio',
      Icon: iconService.getItemIcon(false, 'mp3'),
      name: translate('general.searchBar.filters.audio') as string,
    },
  ];

  const NotFoundState = () => (
    <div className="flex h-full flex-col items-center justify-center space-y-4">
      <Binoculars weight="thin" className="text-gray-100" size={64} />
      <div className="flex flex-col items-center space-y-1">
        <p className="text-xl font-medium text-gray-100">
          {translate('general.searchBar.notFoundState.title') as string}
        </p>
        <p className="text-sm font-normal text-gray-60">
          {translate('general.searchBar.notFoundState.subtitle') as string}
        </p>
      </div>
    </div>
  );

  const EmptyState = () => (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="relative h-20 w-28">
        <FolderIcon className="absolute top-0 left-11 h-16 w-16 rotate-10 transform drop-shadow-soft filter" />
        <PdfIcon className="absolute top-0 left-2 h-16 w-16 rotate-10- transform drop-shadow-soft filter" />
      </div>
      <p className="text-xl font-medium text-gray-100">{translate('general.searchBar.emptyState.title') as string}</p>
      <p className="text-sm font-normal text-gray-60">{translate('general.searchBar.emptyState.subtitle') as string}</p>
    </div>
  );

  return (
    <div className="flex h-14 w-full items-center justify-between border-b border-gray-5 text-gray-40">
      {hideSearch ? (
        <div />
      ) : (
        <form className="relative flex h-full w-full items-center" onSubmitCapture={handleSubmit}>
          <label
            className={`${
              openSeachBox ? 'max-w-screen-sm' : 'max-w-sm'
            } relative flex w-full items-center rounded-lg transition-all duration-150 ease-out`}
            htmlFor="globalSearchInput"
          >
            <MagnifyingGlass
              className="z-1 pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 transform text-gray-60 focus-within:text-gray-80"
              size={20}
            />
            <input
              ref={searchInput}
              id="globalSearchInput"
              autoComplete="off"
              spellCheck="false"
              type="text"
              value={query}
              className="inxt-input outline-none left-icon h-10 w-full appearance-none rounded-lg border border-transparent bg-gray-5 px-9 text-lg text-gray-100 placeholder-gray-60 ring-1 ring-gray-10 transition-all duration-150 ease-out hover:shadow-sm hover:ring-gray-20 focus:border-primary focus:bg-white focus:placeholder-gray-80 focus:shadow-none focus:ring-3 focus:ring-primary focus:ring-opacity-10"
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
                  setOpenSeachBox(false);
                }
              }}
              onFocusCapture={() => setOpenSeachBox(true)}
              placeholder={translate('general.searchBar.placeholder') as string}
            />
            <div
              className={`${
                openSeachBox && 'opacity-0'
              } z-1 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transform rounded-md bg-gray-10 py-1 px-2 text-sm text-gray-50`}
            >
              {isMacOs ? '⌘F' : 'Ctrl F'}
            </div>
            <X
              className={`${
                (query.length === 0 || !openSeachBox) && 'pointer-events-none opacity-0'
              } z-1 absolute right-2.5 top-1/2 -translate-y-1/2 transform cursor-pointer text-gray-60 transition-all duration-100 ease-out`}
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
              openSeachBox
                ? 'translate-y-1.5 scale-100 opacity-100'
                : 'pointer-events-none -translate-y-0.5 scale-98 opacity-0'
            } absolute top-12 z-10 flex h-80 w-full max-w-screen-sm origin-top transform flex-col overflow-hidden rounded-xl bg-white text-gray-100 shadow-subtle-hard ring-1 ring-gray-10 transition-all duration-150 ease-out`}
            onMouseEnter={() => setPreventBlur(true)}
            onMouseLeave={() => setPreventBlur(false)}
          >
            <div className="flex w-full flex-shrink-0 items-center justify-between border-b border-gray-5 px-2.5 py-2.5">
              <button type="button" className="flex items-center space-x-2">
                {filterItems.map((item) => (
                  <FilterItem key={item.id} {...item} />
                ))}
              </button>

              <button
                type="button"
                className={`${
                  filters.length === 0 && 'pointer-events-none opacity-0'
                } flex h-8 cursor-pointer items-center space-x-2 rounded-full bg-gray-1 px-3 text-sm font-medium text-gray-60 transition-all duration-100 ease-out hover:bg-gray-5`}
                onClick={() => setFilters([])}
              >
                {translate('general.searchBar.filters.clear') as string}
              </button>
            </div>

            {searchResult.length > 0 ? (
              <ul ref={searchResultList} className="flex h-full flex-col overflow-y-auto pb-4">
                {searchResult.map((item, index) => {
                  const Icon = iconService.getItemIcon(item.type === 'folder', item.type);
                  return (
                    <li
                      key={item.id}
                      id={`searchResult_${item.id}`}
                      role="option"
                      aria-selected={selectedResult === index}
                      className={`${
                        selectedResult === index && 'bg-gray-5'
                      } flex h-11 flex-shrink-0 cursor-pointer items-center space-x-2.5 px-4 text-gray-100`}
                      onMouseEnter={() => setSelectedResult(index)}
                      onClickCapture={() => openItem(item.id)}
                    >
                      <Icon className="h-7 w-7 drop-shadow-soft filter" />
                      <p className="w-full overflow-hidden overflow-ellipsis whitespace-nowrap">{item.name}</p>
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

      <div className="flex flex-shrink-0">
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
