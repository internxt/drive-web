import { LegacyRef, useEffect, useRef, useState } from 'react';
import { Menu } from '@headlessui/react';
import { DotsThree } from 'phosphor-react';
import BaseCheckbox from 'app/shared/components/forms/BaseCheckbox/BaseCheckbox';

export type ListItemMenu<T> = Array<{
  separator?: boolean;
  name: string;
  icon?: React.ForwardRefExoticComponent<{ size?: number | string }>;
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
  menu?: ListItemMenu<T>;
}

export default function ListItem<T extends { id: string }>({
  item,
  itemComposition,
  selected,
  columnsWidth,
  onSelectedChanged,
  onDoubleClick,
  onClick,
  menu,
}: ItemProps<T>): JSX.Element {
  const menuButtonRef = useRef<HTMLButtonElement | undefined>();
  const rootWrapperRef = useRef<HTMLDivElement | null>(null);
  const [openedFromRightClick, setOpenedFromRightClick] = useState(false);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);

  const handleContextMenuClick = (event) => {
    event.preventDefault();

    const wrapperRect = rootWrapperRef?.current?.getBoundingClientRect();
    setPosX(event.clientX - (wrapperRect?.left || 0));
    setPosY(event.clientY - (wrapperRect?.top || 0));
    setOpenedFromRightClick(true);
    menuButtonRef.current?.click();
  };

  return (
    <div
      onDoubleClick={onDoubleClick}
      onClick={onClick}
      onContextMenu={handleContextMenuClick}
      ref={rootWrapperRef}
      className={`group relative flex h-14 flex-row items-center pl-14 pr-5 ${
        selected ? 'bg-primary bg-opacity-10 text-gray-100' : 'focus-within:bg-gray-1 hover:bg-gray-1'
      }`}
    >
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
      {new Array(itemComposition.length).fill(0).map((col, i) => (
        <div
          key={i}
          className={`relative flex h-full flex-shrink-0 flex-row items-center border-b ${
            selected ? 'border-primary border-opacity-5' : 'border-gray-5'
          } ${columnsWidth[i]}`}
        >
          {itemComposition[i](item)}
        </div>
      ))}
      <div
        className={`flex h-14 w-12 flex-shrink-0 flex-col items-center justify-center border-b ${
          selected ? 'border-primary border-opacity-5' : 'border-gray-5'
        }`}
      >
        <Menu as="div" className={openedFromRightClick ? '' : 'relative'}>
          {({ open }) => {
            useEffect(() => {
              if (!open) {
                setOpenedFromRightClick(false);
                setPosX(0);
                setPosY(0);
              }
            }, [open]);

            return (
              <>
                <Menu.Button
                  ref={menuButtonRef as LegacyRef<HTMLButtonElement>}
                  className={`outline-none focus-visible:outline-primary flex h-10 w-10 flex-col items-center justify-center rounded-md opacity-0 focus-visible:opacity-100 group-hover:opacity-100 ${
                    selected ? 'text-gray-80 hover:bg-primary hover:bg-opacity-10' : 'text-gray-60 hover:bg-gray-10'
                  }`}
                >
                  <DotsThree size={24} weight="bold" />
                </Menu.Button>
                {open && (
                  <Menu.Items
                    style={
                      openedFromRightClick
                        ? { position: 'absolute', left: posX, top: posY, zIndex: 99 }
                        : { position: 'absolute', right: 0, zIndex: 99 }
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
                              {({ active, disabled }) => (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    option.action?.(item);
                                  }}
                                  className={`flex cursor-pointer flex-row whitespace-nowrap px-4 py-1.5 text-base ${
                                    active
                                      ? 'bg-gray-5 text-gray-100'
                                      : disabled
                                      ? 'pointer-events-none text-gray-40'
                                      : 'text-gray-80'
                                  }`}
                                >
                                  <div className="flex flex-row items-center space-x-2">
                                    {option.icon && <option.icon size={20} />}
                                    <span>{option.name}</span>
                                  </div>
                                </div>
                              )}
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
