import { ReactNode } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';

const ItemsDropdown = ({ title, menuItems }: { title: JSX.Element; menuItems: ReactNode[] }) => {
  return (
    <Menu>
      <MenuButton
        className={'flex h-full w-full rounded-lg text-base transition-all duration-75 ease-in-out outline-none'}
      >
        {title}
      </MenuButton>
      <Transition
        enter="transition duration-50 ease-out"
        enterFrom="scale-98 opacity-0"
        enterTo="scale-100 opacity-100"
        leave="transition duration-50 ease-out"
        leaveFrom="scale-98 opacity-100"
        leaveTo="scale-100 opacity-0"
      >
        <MenuItems className="left-0 w-full pt-2 outline-none">
          {menuItems && (
            <div className="w-full">
              {menuItems?.map((item, index) => (
                <div
                  className={index === 0 ? '' : 'border-t border-gray-5 hover:border-transparent'}
                  key={'menuitem-' + index}
                >
                  <MenuItem>{item}</MenuItem>
                </div>
              ))}
            </div>
          )}
        </MenuItems>
      </Transition>
    </Menu>
  );
};

export default ItemsDropdown;
