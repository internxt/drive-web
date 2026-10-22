import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Button } from '@internxt/ui';
import { CalendarBlankIcon, XIcon } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import dayjs, { Dayjs } from 'dayjs';
import DateCalendar from 'views/Home/components/DateCalendar';

export const LINK_EXPIRATION_MAX_YEARS = 1;

export const getLinkExpirationRange = (today: Dayjs = dayjs()) => ({
  minDate: today.startOf('day'),
  maxDate: today.add(LINK_EXPIRATION_MAX_YEARS, 'year').endOf('day'),
});

interface LinkExpirationSelectorProps {
  isLoading: boolean;
  onChange: (date?: Dayjs) => void;
  value?: Dayjs;
}

export const LinkExpirationSelector = ({ isLoading, onChange, value }: LinkExpirationSelectorProps) => {
  const { translate } = useTranslationContext();
  const { minDate, maxDate } = getLinkExpirationRange();

  const renderValue = () => {
    if (isLoading) {
      return <span className="h-4 w-24 animate-pulse rounded bg-gray-5" aria-hidden="true" />;
    }

    return (
      <p className={value ? 'text-gray-100' : 'text-gray-40'}>{value ? value.format('DD/MM/YYYY') : 'dd/mm/yyyy'}</p>
    );
  };

  return (
    <div className="flex items-end justify-between">
      <div className="flex w-full flex-col space-y-2.5">
        <p className="font-medium">{translate('shareItemDialog.expiringDate')}</p>
        <div className="flex items-center space-x-2">
          <Popover className="relative z-10 grow">
            {({ open }) => {
              const isOpen = open && !isLoading;

              return (
                <>
                  <PopoverButton
                    as="div"
                    disabled={isLoading}
                    aria-busy={isLoading}
                    className={`z-1 w-full outline-none ${isLoading ? 'pointer-events-none cursor-not-allowed' : ''}`}
                  >
                    <Button
                      variant="secondary"
                      disabled={isLoading}
                      className="w-full [&>*]:w-full [&>*]:justify-between"
                    >
                      {renderValue()}
                      <CalendarBlankIcon size={24} className={isLoading ? 'text-gray-40' : 'text-white'} />
                    </Button>
                  </PopoverButton>
                  <PopoverPanel
                    className={`absolute bottom-full z-0 mb-1 w-min origin-bottom-left rounded-lg border border-gray-10 bg-surface shadow-subtle transition-all duration-50 ease-out ${
                      isOpen ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
                    }`}
                    static
                  >
                    {({ close }) => (
                      <DateCalendar
                        selected={value}
                        minDate={minDate}
                        maxDate={maxDate}
                        allowFutureDates
                        onSelect={(date) => {
                          onChange(date.endOf('day'));
                          close();
                        }}
                      />
                    )}
                  </PopoverPanel>
                </>
              );
            }}
          </Popover>
          {value && !isLoading && (
            <button
              type="button"
              aria-label={translate('shareItemDialog.removeExpiringDate')}
              title={translate('shareItemDialog.removeExpiringDate')}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-60 hover:bg-gray-5 hover:text-gray-100"
              onClick={() => onChange(undefined)}
            >
              <XIcon size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
