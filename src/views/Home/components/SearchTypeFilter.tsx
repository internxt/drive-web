import { Menu, MenuButton, MenuItems } from '@headlessui/react';
import { SearchFileCategory } from '../services';
import { Checkbox } from '@internxt/ui';
import iconService from 'app/drive/services/icon.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { areAllTypeCategoriesSelected, isTypeFilterActive, TYPE_FILTER_ITEMS } from '../utils/typeFilterUtils';
import DropdownOpenObserver from './DropdownOpenObserver';
import SearchFilterPill from './SearchFilterPill';
import SearchFilterRow from './SearchFilterRow';

interface SearchTypeFilterProps {
  selected: SearchFileCategory[];
  onToggle: (category: SearchFileCategory) => void;
  onToggleAll: () => void;
  onOpenChange: (open: boolean) => void;
}

const SearchTypeFilter = ({ selected, onToggle, onToggleAll, onOpenChange }: SearchTypeFilterProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const allSelected = areAllTypeCategoriesSelected(selected);
  const isFiltering = isTypeFilterActive(selected);

  return (
    <Menu as="div" className="relative min-w-0">
      {({ open }) => (
        <>
          <DropdownOpenObserver open={open} onOpenChange={onOpenChange} />
          <MenuButton
            as={SearchFilterPill}
            label={translate('general.searchBar.filters.attachments')}
            active={isFiltering}
          />

          <MenuItems
            transition
            modal={false}
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
