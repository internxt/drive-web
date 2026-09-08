import { Menu, MenuButton, MenuItem, MenuItems, Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { CaretDownIcon, CheckIcon, XIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import {
  CustomSizeRange,
  isSizeFilterActive,
  isSizeWithinLimit,
  SearchSizePreset,
  SIZE_PRESET_ITEMS,
  SIZE_UNIT_ITEMS,
  SizeUnit,
} from '../utils/sizeFilterUtils';
import DropdownOpenObserver from './DropdownOpenObserver';
import SearchFilterPill from './SearchFilterPill';
import SearchFilterRadioList from './SearchFilterRadioList';

interface SizeUnitSelectProps {
  unit: SizeUnit;
  onChange: (unit: SizeUnit) => void;
}

const SizeUnitSelect = ({ unit, onChange }: SizeUnitSelectProps): JSX.Element => {
  const { translate } = useTranslationContext();

  return (
    <Menu as="div" className="relative">
      <MenuButton className="flex h-10 w-24 items-center justify-between rounded-md border border-gray-20 bg-surface px-3 text-gray-100 outline-none dark:bg-gray-5">
        <span>{unit}</span>
        <CaretDownIcon size={16} />
      </MenuButton>
      <MenuItems
        transition
        className="absolute right-0 z-30 mt-1 flex min-w-[160px] origin-top-right flex-col rounded-lg border border-gray-10 bg-surface py-1.5 shadow-subtle-hard outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 dark:bg-gray-5"
      >
        {SIZE_UNIT_ITEMS.map(({ id, labelKey }) => (
          <MenuItem key={id}>
            <button
              type="button"
              onClick={() => onChange(id)}
              className="flex flex-row items-center justify-between gap-4 px-4 py-2 text-left text-gray-100 data-[focus]:bg-gray-5 dark:data-[focus]:bg-gray-10"
            >
              <span>{translate(`general.searchBar.filters.size.${labelKey}`)}</span>
              {unit === id && <CheckIcon size={18} />}
            </button>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
};

interface SearchSizeInputProps {
  label: string;
  value?: number;
  unit: SizeUnit;
  onValueChange: (value?: number) => void;
  onUnitChange: (unit: SizeUnit) => void;
  onEnter: () => void;
}

const SearchSizeInput = ({
  label,
  value,
  unit,
  onValueChange,
  onUnitChange,
  onEnter,
}: SearchSizeInputProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const [text, setText] = useState('');

  useEffect(() => {
    setText(value !== undefined ? String(value) : '');
  }, [value]);

  const handleTextChange = (nextText: string) => {
    const digits = nextText.replace(/\D/g, '');
    const nextValue = digits === '' ? undefined : Number(digits);
    if (nextValue !== undefined && !isSizeWithinLimit(nextValue, unit)) return;
    setText(digits);
    if (nextValue !== value) onValueChange(nextValue);
  };

  return (
    <div className="flex flex-row gap-3">
      <div className="flex flex-1 flex-col gap-1">
        <p className="text-sm font-medium text-gray-100">{label}</p>
        <label className="flex h-10 cursor-text items-center rounded-md border border-gray-20 bg-surface px-3 focus-within:border-primary dark:bg-gray-5">
          <input
            type="text"
            inputMode="numeric"
            value={text}
            spellCheck="false"
            autoComplete="off"
            onChange={(event) => handleTextChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onEnter();
              }
            }}
            onBlur={() => setText(value !== undefined ? String(value) : '')}
            className="appearance-none border-none bg-transparent !p-0 !shadow-none !ring-0 text-gray-100 outline-none"
            style={{ width: `${Math.max(text.length, 1)}ch` }}
          />
          <span className="pointer-events-none pl-1 text-gray-40">{unit}</span>
          <div className="grow" />
          {text.length > 0 && (
            <button
              type="button"
              aria-label={`Clear ${label}`}
              className="flex shrink-0 cursor-pointer items-center text-gray-60"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleTextChange('')}
            >
              <XIcon size={18} />
            </button>
          )}
        </label>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-gray-100">{translate('general.searchBar.filters.size.unit')}</p>
        <SizeUnitSelect unit={unit} onChange={onUnitChange} />
      </div>
    </div>
  );
};

interface SearchSizeFilterProps {
  preset: SearchSizePreset;
  custom: CustomSizeRange;
  onSelectPreset: (preset: SearchSizePreset) => void;
  onChangeCustom: (changes: Partial<CustomSizeRange>) => void;
  onOpenChange: (open: boolean) => void;
}

const SearchSizeFilter = ({
  preset,
  custom,
  onSelectPreset,
  onChangeCustom,
  onOpenChange,
}: SearchSizeFilterProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const isFiltering = isSizeFilterActive(preset, custom);

  return (
    <Popover className="relative min-w-0">
      {({ open, close }) => (
        <>
          <DropdownOpenObserver open={open} onOpenChange={onOpenChange} />
          <PopoverButton
            as={SearchFilterPill}
            label={translate('general.searchBar.filters.size.size')}
            active={isFiltering}
          />

          <PopoverPanel
            transition
            className="absolute left-0 z-20 mt-1 flex min-w-[320px] origin-top-left flex-col rounded-lg border border-gray-10 bg-surface py-1.5 shadow-subtle-hard outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 dark:bg-gray-5"
          >
            <SearchFilterRadioList
              anyLabel={translate('general.searchBar.filters.size.anySize')}
              items={SIZE_PRESET_ITEMS.map(({ id, labelKey }) => ({
                id,
                label: translate(`general.searchBar.filters.size.${labelKey}`),
              }))}
              selected={preset}
              onSelect={onSelectPreset}
            />
            {preset === 'custom' && (
              <>
                <div className="mx-4 border-t border-gray-10" />
                <div className="flex flex-col gap-2 px-4 pb-2.5 pt-2">
                  <SearchSizeInput
                    label={translate('general.searchBar.filters.size.biggerThan')}
                    value={custom.biggerThan}
                    unit={custom.biggerThanUnit}
                    onValueChange={(value) => onChangeCustom({ biggerThan: value })}
                    onUnitChange={(unit) => onChangeCustom({ biggerThanUnit: unit })}
                    onEnter={close}
                  />
                  <SearchSizeInput
                    label={translate('general.searchBar.filters.size.smallerThan')}
                    value={custom.smallerThan}
                    unit={custom.smallerThanUnit}
                    onValueChange={(value) => onChangeCustom({ smallerThan: value })}
                    onUnitChange={(unit) => onChangeCustom({ smallerThanUnit: unit })}
                    onEnter={close}
                  />
                </div>
              </>
            )}
          </PopoverPanel>
        </>
      )}
    </Popover>
  );
};

export default SearchSizeFilter;
