import { Menu, Transition } from '@headlessui/react';
import { ReactNode } from 'react';
import { ListItemMenu } from '../List/ListItem';
import { DriveItemData } from 'app/drive/types';

export default function Dropdown({
  children,
  options,
  classButton,
  menuItems,
  classMenuItems,
  openDirection,
  dropdownActionsContext,
  item,
}: {
  children: ReactNode | ((obj: any) => JSX.Element);
  options?: { text: string; onClick: () => void }[];
  classButton?: string;
  menuItems?: ReactNode[];
  classMenuItems: string;
  openDirection: 'left' | 'right';
  dropdownActionsContext?: ListItemMenu<DriveItemData>;
  item?: DriveItemData;
}): JSX.Element {
  const direction = openDirection === 'left' ? 'origin-top-left' : 'origin-top-right';

  function handleActiveItemStyle(active, disabled) {
    if (active) {
      return 'bg-gray-5 text-gray-100';
    }
    return disabled ? 'pointer-events-none font-medium text-gray-100' : 'text-gray-80';
  }

  return (
    <Menu as="div" className="relative outline-none">
      <Menu.Button className={`cursor-pointer outline-none ${classButton}`}>{children}</Menu.Button>

      <Transition
        className={`absolute ${openDirection === 'left' ? 'left-0' : 'right-0'}`}
        enter={`${direction} transition duration-100 ease-out`}
        enterFrom="scale-95 opacity-0"
        enterTo="scale-100 opacity-100"
        leave={`${direction} transition duration-100 ease-out`}
        leaveFrom="scale-95 opacity-100"
        leaveTo="scale-100 opacity-0"
      >
        <Menu.Items className={`absolute shadow-subtle-hard ${classMenuItems}`}>
          {options?.map((option) => (
            <Menu.Item key={option.text}>
              <div
                onKeyDown={() => {}}
                className="cursor-pointer px-3 py-1.5 text-gray-80 hover:bg-primary hover:text-white active:bg-primary-dark"
                onClick={option.onClick}
              >
                {option.text}
              </div>
            </Menu.Item>
          ))}
          {menuItems && (
            <div className="w-full max-w-xs">
              {menuItems?.map((item) => (
                <Menu.Item key={'menuitem-' + item}>{item}</Menu.Item>
              ))}
            </div>
          )}
          {dropdownActionsContext && item && (
            <div className="w-full max-w-xs">
              {dropdownActionsContext?.map((option, i) => (
                <div key={option?.name}>
                  {option &&
                    (option.separator ? (
                      <div className="my-0.5 flex w-full flex-row px-4">
                        <div className="h-px w-full bg-gray-10" />
                      </div>
                    ) : (
                      <Menu.Item disabled={option.disabled?.(item)}>
                        {({ active, disabled }) => {
                          return (
                            <div
                              onKeyDown={() => {}}
                              onClick={(e) => {
                                e.stopPropagation();
                                option.action?.(item);
                              }}
                              className={`flex cursor-pointer flex-row whitespace-nowrap px-4 py-1.5 text-base ${handleActiveItemStyle(
                                active,
                                disabled,
                              )}`}
                            >
                              <div className="flex flex-row items-center space-x-2">
                                {option.icon && <option.icon size={20} />}
                                <span>{option.name}</span>
                              </div>
                              <span className="ml-5 flex grow items-center justify-end text-sm text-gray-40">
                                {option.keyboardShortcutOptions?.keyboardShortcutIcon && (
                                  <option.keyboardShortcutOptions.keyboardShortcutIcon size={14} />
                                )}
                                {option.keyboardShortcutOptions?.keyboardShortcutText ?? ''}
                              </span>
                            </div>
                          );
                        }}
                      </Menu.Item>
                    ))}
                </div>
              ))}
            </div>
          )}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
