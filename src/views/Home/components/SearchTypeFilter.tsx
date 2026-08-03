import { Menu, MenuButton, MenuItems } from '@headlessui/react';
import { SearchFileCategory } from '../services';
import { Checkbox } from '@internxt/ui';
import { CaretDownIcon } from '@phosphor-icons/react';
import iconService from 'app/drive/services/icon.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useEffect, useRef } from 'react';
import { areAllTypeCategoriesSelected, isTypeFilterActive, TYPE_FILTER_ITEMS } from '../utils/typeFilterUtils';
import SearchFilterRow from './SearchFilterRow';

interface SearchTypeFilterProps {
  selected: SearchFileCategory[];
  onToggle: (category: SearchFileCategory) => void;
  onToggleAll: () => void;
  onClose: () => void;
}

const MenuCloseObserver = ({ open, onClose }: { open: boolean; onClose: () => void }): null => {
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) onClose();
    wasOpen.current = open;
  }, [open]);
  return null;
};

const SearchTypeFilter = ({ selected, onToggle, onToggleAll, onClose }: SearchTypeFilterProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const allSelected = areAllTypeCategoriesSelected(selected);
  const isFiltering = isTypeFilterActive(selected);

  return (
    <Menu as="div" className="relative">
      {({ open }) => (
        <>
          <MenuCloseObserver open={open} onClose={onClose} />
          <MenuButton
            className={`${
              isFiltering
                ? 'bg-primary/10 text-primary ring-primary/20 dark:bg-primary/20 dark:text-white dark:ring-primary/75'
                : 'bg-surface text-gray-80 ring-gray-10 hover:bg-gray-1 hover:shadow-sm hover:ring-gray-20 dark:bg-gray-5 dark:hover:bg-gray-10'
            } flex h-8 cursor-pointer items-center space-x-2 rounded-full px-3 font-medium shadow-sm outline-none ring-1 transition-all duration-100 ease-out`}
          >
            <span className="text-sm">{translate('general.searchBar.filters.attachments')}</span>
            <CaretDownIcon size={16} />
          </MenuButton>

          <MenuItems
            transition
            className="absolute left-0 z-20 mt-1 flex min-w-[240px] origin-top-left flex-col rounded-lg border border-gray-10 bg-surface py-1.5 shadow-subtle-hard outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 dark:bg-gray-5"
          >
            <SearchFilterRow onClick={onToggleAll}>
              <Checkbox checked={allSelected} indeterminate={isFiltering} />
              <p className="text-gray-100">{translate('general.searchBar.filters.anyType')}</p>
            </SearchFilterRow>
            <div className="mx-4 border-t border-gray-10" />
            {TYPE_FILTER_ITEMS.map(({ id, labelKey, extension }) => {
              const Icon = iconService.getItemIcon(id === 'folder', extension);
              return (
                <SearchFilterRow onClick={() => onToggle(id)} key={id}>
                  <Checkbox checked={selected.includes(id)} />
                  <Icon className="h-6 w-6 drop-shadow-soft" />
                  <p className="text-gray-100">{translate(`general.searchBar.filters.${labelKey}`)}</p>
                </SearchFilterRow>
              );
            })}
          </MenuItems>
        </>
      )}
    </Menu>
  );
};

export default SearchTypeFilter;
