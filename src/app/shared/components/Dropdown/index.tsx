import { Menu, Transition } from '@headlessui/react';
import { ReactNode } from 'react';

export default function Dropdown({
  children,
  options,
  classButton,
  menuItems,
  classMenuItems,
  openDirection
}: {
  children: ReactNode;
  options?: { text: string; onClick: () => void }[];
  classButton?: string;
  menuItems?: ReactNode[];
  classMenuItems: string;
  openDirection: 'left' | 'right';
}): JSX.Element {
  return (
    <Menu>
      <div className='flex relative'>
        <Menu.Button className={`cursor-pointer outline-none ${classButton}`}>{children}</Menu.Button>

        <Transition
          className={`absolute ${openDirection === 'left' ? 'left-0' : 'right-0'}`}
          enter="transition duration-100 ease-out"
          enterFrom="transform scale-95 opacity-0"
          enterTo="transform scale-100 opacity-100"
          leave="transition duration-75 ease-out"
          leaveFrom="transform scale-100 opacity-100"
          leaveTo="transform scale-95 opacity-0"
        >
          <Menu.Items className={`absolute ${classMenuItems}`}>
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
            {menuItems && <div className="w-52">
              {menuItems?.map((item, index) => (
                <Menu.Item key={'menuitem-' + index}>
                  {item}
                </Menu.Item>
              ))}
            </div>
            }
          </Menu.Items>
        </Transition>
      </div>
    </Menu>
  );
}
