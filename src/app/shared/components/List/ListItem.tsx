import { LegacyRef, useEffect, useRef, useState } from 'react';
import { Menu } from '@headlessui/react';
import { DotsThree } from 'phosphor-react';
import BaseCheckbox from 'app/shared/components/forms/BaseCheckbox/BaseCheckbox';
import { useHotkeys } from 'react-hotkeys-hook';

export type ListItemMenu<T> = Array<{
  separator?: boolean;
  name: string;
  icon?: React.ForwardRefExoticComponent<{ size?: number | string }>;
  keyboardShortcutOptions?: {
    keyboardShortcutIcon?: React.ForwardRefExoticComponent<{ size?: number | string }>;
    keyboardShortcutText?: string;
  };
  action: (target: T) => void;
  disabled?: (target: T) => boolean;
}>;

interface ItemProps<T> {
  item: T;
  itemComposition: Array<(props: T) => JSX.Element>;
  selected: boolean;
  columnsWidth: Array<string>;
  onSelectedChanged: (value: boolean) => void;
  onDoubleClick?: () => void;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onClickContextMenu?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onThreeDotsButtonPressed?: (item: T) => void;
  menu?: ListItemMenu<T>;
  disableItemCompositionStyles?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const MENU_BUTTON_HEIGHT = 40;

export default function ListItem<T extends { id: string }>({
  item,
  itemComposition,
  selected,
  columnsWidth,
  onSelectedChanged,
  onDoubleClick,
  onClick,
  onClickContextMenu,
  onThreeDotsButtonPressed,
  disableItemCompositionStyles,
  menu,
  onMouseEnter,
  onMouseLeave,
}: ItemProps<T>): JSX.Element {
  const menuButtonRef = useRef<HTMLButtonElement | undefined>();
  const rootWrapperRef = useRef<HTMLDivElement | null>(null);
  const menuItemsRef = useRef<HTMLDivElement | null>(null);

  const [openedFromRightClick, setOpenedFromRightClick] = useState(false);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (
      menuItemsRef.current &&
      (menuItemsRef.current.offsetHeight !== dimensions.height ||
        menuItemsRef.current?.offsetWidth !== dimensions.width)
    )
      setDimensions({
        width: menuItemsRef.current.offsetWidth,
        height: menuItemsRef.current.offsetHeight,
      });
  }, []);

  const handleContextMenuClick = (event) => {
    event.preventDefault();

    onClickContextMenu?.(event);
    const childWidth = menuItemsRef?.current?.offsetWidth || 240;
    const childHeight = menuItemsRef?.current?.offsetHeight || 300;
    const wrapperRect = rootWrapperRef?.current?.getBoundingClientRect();
    const { innerWidth, innerHeight } = window;
    let x = event.clientX - (wrapperRect?.left || 0);
    let y = event.clientY - (wrapperRect?.top || 0);

    if (event.clientX + childWidth > innerWidth) {
      x = x - childWidth;
    }

    if (event.clientY + childHeight > innerHeight) {
      y = y - childHeight;
    }
    setPosX(x);
    setPosY(y);
    setOpenedFromRightClick(true);
    menuButtonRef.current?.click();
  };

  // This is used to get the size of the menu item list and adjust its position depending on where you are trying to open it.
  // As the size of the list is not fixed we need to create an item equal to the list to be rendered
  // at the same time as the view to get the size and make the necessary positional adjustments.
  const MenuItemList = () => (
    <div
      className="outline-none z-20 mt-0 flex flex-col rounded-lg bg-white py-1.5 shadow-subtle-hard"
      style={{
        minWidth: '180px',
        position: 'fixed',
        top: -9999,
        left: -9999,
      }}
      ref={menuItemsRef}
    >
      {menu?.map((option, i) => (
        <div key={i}>
          {option.separator ? (
            <div className="my-0.5 flex w-full flex-row px-4">
              <div className="h-px w-full bg-gray-10" />
            </div>
          ) : (
            <div>
              <div className={'flex cursor-pointer flex-row whitespace-nowrap px-4 py-1.5 text-base'}>
                <div className="flex flex-row items-center space-x-2">
                  {option.icon && <option.icon size={20} />}
                  <span>{option.name}</span>
                </div>
                <span className="ml-5 flex flex-grow items-center justify-end text-sm text-gray-40">
                  {option.keyboardShortcutOptions?.keyboardShortcutIcon && (
                    <option.keyboardShortcutOptions.keyboardShortcutIcon size={14} />
                  )}
                  {option.keyboardShortcutOptions?.keyboardShortcutText ?? ''}
                </span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div
      onDoubleClick={onDoubleClick}
      onClick={onClick}
      onContextMenu={handleContextMenuClick}
      ref={rootWrapperRef}
      className={`group relative flex h-14 flex-row items-center pl-14 pr-5 ${
        selected ? 'bg-primary bg-opacity-10 text-gray-100' : 'focus-within:bg-gray-1 hover:bg-gray-1'
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <MenuItemList />
      <div
        className={`absolute left-5 top-0 flex h-full w-0 flex-row items-center justify-start p-0 opacity-0 focus-within:opacity-100 group-hover:opacity-100 ${
          selected && 'opacity-100'
        }`}
      >
        <BaseCheckbox
          onClick={(e) => {
            e.stopPropagation();
            onSelectedChanged(!selected);
          }}
          checked={selected}
        />
      </div>
      {disableItemCompositionStyles ? (
        <div
          key={0}
          className={`flex-grow-1 relative flex h-full w-full flex-row items-center border-b ${
            selected ? 'border-primary border-opacity-5' : 'border-gray-5'
          }`}
        >
          {itemComposition[0](item)}
        </div>
      ) : (
        new Array(itemComposition.length).fill(0).map((col, i) => (
          <div
            key={i}
            className={`relative flex h-full flex-shrink-0 flex-row items-center border-b ${
              selected ? 'border-primary border-opacity-5' : 'border-gray-5'
            } ${columnsWidth[i]}`}
          >
            {itemComposition[i](item)}
          </div>
        ))
      )}
      <div
        className={`flex h-14 w-12 flex-shrink-0 flex-col items-center justify-center border-b ${
          selected ? 'border-primary border-opacity-5' : 'border-gray-5'
        }`}
      >
        <Menu as="div" className={openedFromRightClick ? '' : 'relative'}>
          {({ open, close }) => {
            const [isHalfwayDown, setIsHalfwayDown] = useState(false);

            function handleOpenPosition() {
              const element = menuButtonRef.current;
              if (!element) return;

              const { bottom } = element.getBoundingClientRect();
              const windowHeight = window.innerHeight;

              const isHalfway = bottom > windowHeight / 2;
              setIsHalfwayDown(isHalfway);
            }

            useEffect(() => {
              if (!openedFromRightClick) handleOpenPosition();

              if (!open) {
                setOpenedFromRightClick(false);
                setPosX(0);
                setPosY(0);
              }
            }, [open]);

            const handleRPress = () => {
              close();
            };

            useHotkeys('r', handleRPress);

            return (
              <>
                <Menu.Button
                  id={'list-item-menu-button'}
                  ref={menuButtonRef as LegacyRef<HTMLButtonElement>}
                  className={`outline-none flex h-10 w-10 flex-col items-center justify-center rounded-md opacity-0 focus-visible:opacity-100 group-hover:opacity-100 ${
                    selected
                      ? 'text-gray-80 hover:bg-primary hover:bg-opacity-10 focus-visible:bg-primary focus-visible:bg-opacity-10'
                      : 'text-gray-60 hover:bg-gray-10 focus-visible:bg-gray-10'
                  }`}
                  onClick={() => onThreeDotsButtonPressed?.(item)}
                >
                  <DotsThree size={24} weight="bold" />
                </Menu.Button>
                {open && (
                  <Menu.Items
                    className="outline-none"
                    style={
                      openedFromRightClick
                        ? { position: 'absolute', left: posX, top: posY, zIndex: 99 }
                        : {
                            position: 'absolute',
                            right: 0,
                            [isHalfwayDown ? 'bottom' : 'top']: MENU_BUTTON_HEIGHT,
                            zIndex: 99,
                          }
                    }
                  >
                    <div
                      className="z-20 mt-0 flex flex-col rounded-lg bg-white py-1.5 shadow-subtle-hard"
                      style={{
                        minWidth: '180px',
                      }}
                    >
                      {menu?.map((option, i) => (
                        <div key={i}>
                          {option.separator ? (
                            <div className="my-0.5 flex w-full flex-row px-4">
                              <div className="h-px w-full bg-gray-10" />
                            </div>
                          ) : (
                            <Menu.Item disabled={option.disabled?.(item)}>
                              {({ active, disabled }) => {
                                return (
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      option.action?.(item);
                                    }}
                                    className={`flex cursor-pointer flex-row whitespace-nowrap px-4 py-1.5 text-base ${
                                      active
                                        ? 'bg-gray-5 text-gray-100'
                                        : disabled
                                        ? 'pointer-events-none font-medium text-gray-100'
                                        : 'text-gray-80'
                                    }`}
                                  >
                                    <div className="flex flex-row items-center space-x-2">
                                      {option.icon && <option.icon size={20} />}
                                      <span>{option.name}</span>
                                    </div>
                                    <span className="ml-5 flex flex-grow items-center justify-end text-sm text-gray-40">
                                      {option.keyboardShortcutOptions?.keyboardShortcutIcon && (
                                        <option.keyboardShortcutOptions.keyboardShortcutIcon size={14} />
                                      )}
                                      {option.keyboardShortcutOptions?.keyboardShortcutText ?? ''}
                                    </span>
                                  </div>
                                );
                              }}
                            </Menu.Item>
                          )}
                        </div>
                      ))}
                    </div>
                  </Menu.Items>
                )}
              </>
            );
          }}
        </Menu>
      </div>
    </div>
  );
}
