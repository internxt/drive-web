import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { RadioButton } from '@internxt/ui';
import { CaretDownIcon, XIcon } from '@phosphor-icons/react';
import dayjs, { Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useEffect, useState } from 'react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { DATE_PRESET_ITEMS, SearchDatePreset, SpecificDateRange } from '../utils/dateFilterUtils';
import DateCalendar from './DateCalendar';
import DropdownCloseObserver from './DropdownCloseObserver';
import SearchFilterRow from './SearchFilterRow';

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
}

const SearchDateInput = ({ label, value, minDate, maxDate, onChange }: SearchDateInputProps): JSX.Element => {
  const [text, setText] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    setText(value ? value.format(DATE_INPUT_FORMAT) : '');
  }, [value?.valueOf()]);

  const handleTextChange = (nextText: string) => {
    setText(nextText);
    if (nextText === '') {
      onChange(undefined);
      return;
    }
    const parsed = dayjs(nextText, DATE_INPUT_FORMAT, true);
    if (parsed.isValid() && !parsed.isAfter(dayjs(), 'day')) onChange(parsed);
  };

  return (
    <div className="relative flex flex-1 flex-col gap-1">
      <p className="text-sm font-medium text-gray-100">{label}</p>
      <div className="flex h-10 items-center rounded-md border border-gray-20 bg-surface px-3 focus-within:border-primary dark:bg-gray-5">
        <input
          type="text"
          value={text}
          placeholder="dd/mm/yyyy"
          spellCheck="false"
          autoComplete="off"
          onChange={(event) => handleTextChange(event.target.value)}
          onFocus={() => setShowCalendar(true)}
          onBlur={() => {
            setShowCalendar(false);
            setText(value ? value.format(DATE_INPUT_FORMAT) : '');
          }}
          className="w-full appearance-none border-none bg-transparent !p-0 !shadow-none !ring-0 text-gray-100 placeholder-gray-40 outline-none"
        />
        {text.length > 0 && (
          <XIcon
            size={18}
            className="shrink-0 cursor-pointer text-gray-60"
            onMouseDown={(event) => {
              event.preventDefault();
              handleTextChange('');
            }}
          />
        )}
      </div>
      {showCalendar && (
        <div className="absolute left-0 top-full z-30 mt-1" onMouseDown={(event) => event.preventDefault()}>
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
  const isAnyDate = preset === 'any';
  const presetYears: Partial<Record<SearchDatePreset, number>> = {
    thisYear: dayjs().year(),
    lastYear: dayjs().year() - 1,
  };

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <DropdownCloseObserver open={open} onClose={onClose} />
          <PopoverButton
            className={`${
              isAnyDate
                ? 'bg-surface text-gray-80 ring-gray-10 hover:bg-gray-1 hover:shadow-sm hover:ring-gray-20 dark:bg-gray-5 dark:hover:bg-gray-10'
                : 'bg-primary/10 text-primary ring-primary/20 dark:bg-primary/20 dark:text-white dark:ring-primary/75'
            } flex h-8 cursor-pointer items-center space-x-2 rounded-full px-3 font-medium shadow-sm outline-none ring-1 transition-all duration-100 ease-out`}
          >
            <span className="text-sm">{translate('general.searchBar.filters.date.dateModified')}</span>
            <CaretDownIcon size={16} />
          </PopoverButton>

          <PopoverPanel
            transition
            className="absolute left-0 z-20 mt-1 flex min-w-[320px] origin-top-left flex-col rounded-lg border border-gray-10 bg-surface py-1.5 shadow-subtle-hard outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 dark:bg-gray-5"
          >
            <div
              role="none"
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => event.preventDefault()}
            >
              <SearchFilterRow onClick={() => onSelectPreset('any')}>
                <RadioButton checked={isAnyDate} onClick={() => onSelectPreset('any')} />
                <p className="text-gray-100">{translate('general.searchBar.filters.date.anyDate')}</p>
              </SearchFilterRow>
              <div className="mx-4 border-t border-gray-10" />
              {DATE_PRESET_ITEMS.map(({ id, labelKey }) => (
                <SearchFilterRow onClick={() => onSelectPreset(id)} key={id}>
                  <RadioButton checked={preset === id} onClick={() => onSelectPreset(id)} />
                  <p className="text-gray-100">
                    {translate(`general.searchBar.filters.date.${labelKey}`, { year: presetYears[id] })}
                  </p>
                </SearchFilterRow>
              ))}
            </div>
            {preset === 'specific' && (
              <>
                <div className="mx-4 border-t border-gray-10" />
                <div className="flex flex-row gap-3 px-4 pb-2.5 pt-2">
                  <SearchDateInput
                    label={translate('general.searchBar.filters.date.after')}
                    value={specific.after}
                    maxDate={specific.before}
                    onChange={(date) => onChangeDate('after', date)}
                  />
                  <SearchDateInput
                    label={translate('general.searchBar.filters.date.before')}
                    value={specific.before}
                    minDate={specific.after}
                    onChange={(date) => onChangeDate('before', date)}
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
