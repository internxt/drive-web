import { Menu, Transition } from '@headlessui/react';
import { Button } from '@internxt/internxtui';
import { FunnelSimple } from '@phosphor-icons/react/dist/ssr';
import Input from 'app/shared/components/Input';

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
      {/* <Menu as="div" className="relative z-50 inline-block text-left">
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
      </Menu> */}

      <Menu as="div" className="relative outline-none">
        <Menu.Button>
          <Button variant="secondary" className="flex aspect-square flex-row gap-2">
            <p className="text-gray-80">{translate('preferences.workspace.accessLogs.filterActions.title')}</p>
            <FunnelSimple size={24} className="text-gray-100" />
          </Button>
        </Menu.Button>

        <Transition
          className={'absolute left-0 z-20'}
          enter={'origin-top-left transition duration-100 ease-out'}
          enterFrom="scale-95 opacity-0"
          enterTo="scale-100 opacity-100"
          leave={'origin-top-left transition duration-100 ease-out'}
          leaveFrom="scale-95 opacity-100"
          leaveTo="scale-100 opacity-0"
        >
          <Menu.Items
            className={
              'absolute right-0 mt-0 flex min-w-[256px] flex-col rounded-lg border border-gray-10 bg-surface py-1.5 shadow-subtle-hard dark:bg-gray-5'
            }
          >
            <div className="flex w-full flex-col rounded-lg">
              <div className="flex w-full flex-row items-center justify-between">
                <p>{translate('preferences.workspace.accessLogs.filterActions.filters')}</p>
                <Button variant="ghost">{translate('preferences.workspace.accessLogs.filterActions.clear')}</Button>
              </div>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
};
