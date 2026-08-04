import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { XIcon } from '@phosphor-icons/react';
import dayjs, { Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useEffect, useState } from 'react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import {
  DATE_PRESET_ITEMS,
  formatDateInput,
  isDateFilterActive,
  SearchDatePreset,
  SpecificDateRange,
} from '../utils/dateFilterUtils';
import DateCalendar from './DateCalendar';
import DropdownCloseObserver from './DropdownCloseObserver';
import SearchFilterPill from './SearchFilterPill';
import SearchFilterRadioList from './SearchFilterRadioList';

dayjs.extend(customParseFormat);

const DATE_INPUT_FORMAT = 'DD/MM/YYYY';

interface SearchDateFilterProps {
  preset: SearchDatePreset;
  specific: SpecificDateRange;
  onSelectPreset: (preset: SearchDatePreset) => void;
  onChangeDate: (field: 'after' | 'before', date?: Dayjs) => void;
  onClose: () => void;
}

interface SearchDateInputProps {
  label: string;
  value?: Dayjs;
  minDate?: Dayjs;
  maxDate?: Dayjs;
  onChange: (date?: Dayjs) => void;
  onEnter: () => void;
}

const SearchDateInput = ({ label, value, minDate, maxDate, onChange, onEnter }: SearchDateInputProps): JSX.Element => {
  const [text, setText] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    setText(value ? value.format(DATE_INPUT_FORMAT) : '');
  }, [value?.valueOf()]);

  const handleTextChange = (nextText: string) => {
    const nextDate = formatDateInput(nextText);
    setText(nextDate);
    if (nextDate === '') {
      onChange(undefined);
      return;
    }
    const parsed = dayjs(nextDate, DATE_INPUT_FORMAT, true);
    if (parsed.isValid() && !parsed.isAfter(dayjs(), 'day')) onChange(parsed);
  };

  return (
    <div className="relative flex flex-1 flex-col gap-1">
      <p className="text-sm font-medium text-gray-100">{label}</p>
      <div className="flex h-10 items-center rounded-md border border-gray-20 bg-surface px-3 focus-within:border-primary dark:bg-gray-5">
        <input
          type="text"
          inputMode="numeric"
          value={text}
          placeholder="dd/mm/yyyy"
          spellCheck="false"
          autoComplete="off"
          onChange={(event) => handleTextChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onEnter();
            }
          }}
          onFocus={() => setShowCalendar(true)}
          onBlur={() => {
            setShowCalendar(false);
            setText(value ? value.format(DATE_INPUT_FORMAT) : '');
          }}
          className="w-full appearance-none border-none bg-transparent !p-0 !shadow-none !ring-0 text-gray-100 placeholder-gray-40 outline-none"
        />
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
      </div>
      {showCalendar && (
        <div
          role="presentation"
          className="absolute left-0 top-full z-30 mt-1"
          onMouseDown={(event) => event.preventDefault()}
        >
          <DateCalendar selected={value} minDate={minDate} maxDate={maxDate} onSelect={onChange} />
        </div>
      )}
    </div>
  );
};

const SearchDateFilter = ({
  preset,
  specific,
  onSelectPreset,
  onChangeDate,
  onClose,
}: SearchDateFilterProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const isFiltering = isDateFilterActive(preset, specific);
  const presetYears: Partial<Record<SearchDatePreset, number>> = {
    thisYear: dayjs().year(),
    lastYear: dayjs().year() - 1,
  };

  return (
    <Popover className="relative min-w-0">
      {({ open, close }) => (
        <>
          <DropdownCloseObserver open={open} onClose={onClose} />
          <PopoverButton
            as={SearchFilterPill}
            label={translate('general.searchBar.filters.date.dateModified')}
            active={isFiltering}
          />

          <PopoverPanel
            transition
            className="absolute left-0 z-20 mt-1 flex min-w-[320px] origin-top-left flex-col rounded-lg border border-gray-10 bg-surface py-1.5 shadow-subtle-hard outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 dark:bg-gray-5"
          >
            <SearchFilterRadioList
              anyLabel={translate('general.searchBar.filters.date.anyDate')}
              items={DATE_PRESET_ITEMS.map(({ id, labelKey }) => ({
                id,
                label: translate(`general.searchBar.filters.date.${labelKey}`, { year: presetYears[id] }),
              }))}
              selected={preset}
              onSelect={onSelectPreset}
            />
            {preset === 'specific' && (
              <>
                <div className="mx-4 border-t border-gray-10" />
                <div className="flex flex-row gap-3 px-4 pb-2.5 pt-2">
                  <SearchDateInput
                    label={translate('general.searchBar.filters.date.after')}
                    value={specific.after}
                    maxDate={specific.before}
                    onChange={(date) => onChangeDate('after', date)}
                    onEnter={close}
                  />
                  <SearchDateInput
                    label={translate('general.searchBar.filters.date.before')}
                    value={specific.before}
                    minDate={specific.after}
                    onChange={(date) => onChangeDate('before', date)}
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

export default SearchDateFilter;
