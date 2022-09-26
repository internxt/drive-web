import { Menu, Transition } from '@headlessui/react';
import { ReactNode } from 'react';

export default function Dropdown({
  children,
  options,
  classButton,
  menuItems,
  classMenuItems
}: {
  children: ReactNode;
  options?: { text: string; onClick: () => void }[];
  classButton?: string;
  menuItems?: ReactNode;
  classMenuItems?: string;
}): JSX.Element {
  return (
    <Menu>
      <Menu.Button className={`cursor-pointer outline-none ${classButton}`}>{children}</Menu.Button>

      <Transition
        enter="transition duration-100 ease-out"
        enterFrom="transform scale-95 opacity-0"
        enterTo="transform scale-100 opacity-100"
        leave="transition duration-75 ease-out"
        leaveFrom="transform scale-100 opacity-100"
        leaveTo="transform scale-95 opacity-0"
      >
        <Menu.Items className={`absolute mt-2 ml-4 w-max rounded-md border 
        border-black border-opacity-8 bg-white py-1.5 drop-shadow ${classMenuItems}`}>
          {options?.map((option) => (
            <Menu.Item key={option.text}>
              <div
                style={{ lineHeight: 1 }}
                className="cursor-pointer py-1.5 px-3 text-gray-80 hover:bg-primary hover:text-white active:bg-primary-dark"
                onClick={option.onClick}
              >
                {option.text}
              </div>
            </Menu.Item>
          ))}
          {menuItems}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
