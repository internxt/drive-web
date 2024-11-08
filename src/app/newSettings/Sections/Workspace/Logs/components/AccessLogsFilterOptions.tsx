import { Menu, Transition } from '@headlessui/react';
import Input from 'app/shared/components/Input';
import { Fragment, useState } from 'react';
import Calendar from 'react-calendar';

interface FilterOptionsProps {
  searchMembersInputValue: string;
  onFromCalendarChange: (value: Date | null) => void;
  onToCalendarChange: (value: Date | null) => void;
  onSearchMembersInputValueChange: (value: string) => void;
  onPlatformChange: (value: string) => void;
  fromDate: Date | null;
  toDate: Date | null;
  translate: (key: string, props?: Record<string, unknown>) => string;
}

export const AccessLogsFilterOptions = ({
  searchMembersInputValue,
  onFromCalendarChange,
  onToCalendarChange,
  onSearchMembersInputValueChange,
  onPlatformChange,
  fromDate,
  toDate,
  translate,
}: FilterOptionsProps): JSX.Element => {
  const [showToCalendar, setShowToCalendar] = useState(false);

  return (
    <div className="flex flex-row justify-between">
      <Input
        placeholder={translate('preferences.workspace.members.search')}
        variant="email"
        autoComplete="off"
        onChange={onSearchMembersInputValueChange}
        value={searchMembersInputValue}
        name="memberName"
      />
      <Menu as="div" className="relative z-50 inline-block text-left">
        <div>
          <Menu.Button className="inline-flex w-full justify-center rounded-md bg-black bg-opacity-20 px-4 py-2 text-sm font-medium text-white hover:bg-opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75">
            {fromDate ? fromDate.toLocaleDateString() : 'From Date'}
          </Menu.Button>
        </div>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 z-50 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className={'absolute'}>
              <Calendar
                className={'text-black'}
                onChange={(date, e) => {
                  e.stopPropagation();
                  onFromCalendarChange(date as Date);
                }}
              />
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
      <Menu as="div" className="relative inline-block text-left">
        <div>
          <Menu.Button className="inline-flex w-full justify-center rounded-md bg-black bg-opacity-20 px-4 py-2 text-sm font-medium text-white hover:bg-opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75">
            {toDate ? toDate.toLocaleDateString() : 'To Date'}
          </Menu.Button>
        </div>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 z-50 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className={'absolute'}>
              <Calendar
                className={'text-black'}
                onChange={(date, e) => {
                  e.stopPropagation();
                  onToCalendarChange(date as Date);
                }}
              />
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
      <select onChange={(e) => onPlatformChange(e.target.value)}>
        <option value="">{translate('All Platforms')}</option>
        <option value="Web">Web</option>
        <option value="Mobile">Mobile</option>
        <option value="Desktop">Desktop</option>
      </select>
      {showToCalendar && (
        <Calendar
          onChange={(date) => {
            setShowToCalendar(false);
            onToCalendarChange(date as Date);
          }}
        />
      )}
    </div>
  );
};
