import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import dayjs, { Dayjs } from 'dayjs';
import i18next from 'i18next';
import { useEffect, useState } from 'react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

interface DateCalendarProps {
  selected?: Dayjs;
  minDate?: Dayjs;
  maxDate?: Dayjs;
  onSelect: (date: Dayjs) => void;
}

const getMondayFirstGridStart = (month: Dayjs): Dayjs => {
  const firstDayOfMonth = month.startOf('month');
  return firstDayOfMonth.subtract((firstDayOfMonth.day() + 6) % 7, 'day');
};

const getCalendarLocale = (): string => {
  const language = i18next.language ?? 'en';
  return language.toLowerCase() === 'zh-tw' ? 'zh-tw' : language.split('-')[0].toLowerCase();
};

const getDayClassName = (isSelected: boolean, isCurrentMonth: boolean, isDisabled: boolean) => {
  if (isSelected) return 'bg-primary text-white';
  if (isDisabled) return 'cursor-not-allowed text-gray-30';
  const textClass = isCurrentMonth ? 'text-gray-100' : 'text-gray-40';
  return `${textClass} hover:bg-gray-5 dark:hover:bg-gray-10`;
};

const DateCalendar = ({ selected, minDate, maxDate, onSelect }: DateCalendarProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const [month, setMonth] = useState<Dayjs>((selected ?? dayjs()).startOf('month'));

  useEffect(() => {
    if (selected) setMonth(selected.startOf('month'));
  }, [selected?.valueOf()]);

  const locale = getCalendarLocale();
  const gridStart = getMondayFirstGridStart(month);
  const days = Array.from({ length: 42 }, (_, index) => gridStart.add(index, 'day'));
  const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
    dayjs().day(1).add(index, 'day').locale(locale).format('ddd'),
  );

  const isDayDisabled = (day: Dayjs): boolean =>
    Boolean((minDate && day.isBefore(minDate, 'day')) || (maxDate && day.isAfter(maxDate, 'day')));

  const today = dayjs();
  const isTodayDisabled = isDayDisabled(today);

  const selectToday = () => {
    setMonth(today.startOf('month'));
    onSelect(today);
  };

  return (
    <div className="flex w-72 flex-col rounded-lg border border-gray-10 bg-surface p-3 shadow-subtle-hard dark:bg-gray-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth(month.subtract(1, 'month'))}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-5 text-gray-80 hover:bg-gray-10 dark:bg-gray-10 dark:hover:bg-gray-20"
        >
          <CaretLeftIcon size={16} />
        </button>
        <div className="flex flex-col items-center">
          <p className="font-medium capitalize text-gray-100">{month.locale(locale).format('MMMM')}</p>
          <p className="text-sm text-gray-50">{month.format('YYYY')}</p>
        </div>
        <button
          type="button"
          onClick={() => setMonth(month.add(1, 'month'))}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-5 text-gray-80 hover:bg-gray-10 dark:bg-gray-10 dark:hover:bg-gray-20"
        >
          <CaretRightIcon size={16} />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-7 text-center">
        {weekdayLabels.map((label, index) => (
          <p key={`${label}-${index}`} className="py-1 text-xs capitalize text-gray-50">
            {label}
          </p>
        ))}
        {days.map((day) => (
          <button
            key={day.valueOf()}
            type="button"
            disabled={isDayDisabled(day)}
            onClick={() => onSelect(day)}
            className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm ${getDayClassName(
              selected?.isSame(day, 'day') ?? false,
              day.isSame(month, 'month'),
              isDayDisabled(day),
            )}`}
          >
            {day.date()}
          </button>
        ))}
      </div>
      <div className="mt-2 border-t border-gray-10 pt-1">
        <button
          type="button"
          disabled={isTodayDisabled}
          onClick={selectToday}
          className={`w-full rounded-lg py-1.5 text-center font-medium ${
            isTodayDisabled ? 'cursor-not-allowed text-gray-30' : 'text-gray-100 hover:bg-gray-5 dark:hover:bg-gray-10'
          }`}
        >
          {translate('general.searchBar.filters.date.selectToday')}
        </button>
      </div>
    </div>
  );
};

export default DateCalendar;
