import { ReactNode } from 'react';

import { Menu, Transition } from '@headlessui/react';

const ItemsDropdown = ({ title, menuItems }: { title: JSX.Element; menuItems: ReactNode[] }) => {
  return (
    <Menu>
      <Menu.Button className={'flex h-full w-full rounded-lg text-base transition-all duration-75 ease-in-out'}>
        {title}
      </Menu.Button>
      <Transition
        className={'left-0'}
        enter="transition duration-50 ease-out"
        enterFrom="scale-98 opacity-0"
        enterTo="scale-100 opacity-100"
        leave="transition duration-50 ease-out"
        leaveFrom="scale-98 opacity-100"
        leaveTo="scale-100 opacity-0"
      >
        <Menu.Items className={'mt-2 w-full rounded-md bg-white py-1.5'}>
          {menuItems && (
            <div className="border-translate w-full border-gray-10">
              {menuItems?.map((item, index) => (
                <div className={'pt-2'} key={'menuitem-' + index}>
                  <Menu.Item>{item}</Menu.Item>
                </div>
              ))}
            </div>
          )}
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default ItemsDropdown;
