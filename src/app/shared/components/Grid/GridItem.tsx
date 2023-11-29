import { Menu } from '@headlessui/react';
import { DotsThree } from '@phosphor-icons/react';
import BaseCheckbox from 'app/shared/components/forms/BaseCheckbox/BaseCheckbox';

interface ItemProps {
  item: Record<string, unknown>;
  itemComposition: (props: Record<string, unknown>, active: boolean) => JSX.Element;
  selected: boolean;
  columns: Array<string>;
  toggleSelectItem: () => void;
  selectItem: () => void;
  onDoubleClick?: (props?: any) => any;
  menu?: Array<{
    separator?: boolean;
    name?: string;
    icon?: any;
    action?: (props: any) => void;
    disabled?: (props: any, selected: any) => boolean;
  }>;
}

export default function GridItem({
  item,
  itemComposition,
  selected,
  toggleSelectItem,
  selectItem,
  onDoubleClick,
  menu,
}: ItemProps): JSX.Element {
  return (
    <div
      onClick={toggleSelectItem}
      onDoubleClick={() => onDoubleClick?.(item)}
      className="group relative flex flex-col items-center"
    >
      {/* SELECTION CHECKBOX */}
      <div
        className={`absolute left-2 top-2 z-10 flex h-8 w-8 flex-col items-center justify-center opacity-0 focus-within:opacity-100 group-hover:opacity-100 ${
          selected && 'opacity-100'
        }`}
      >
        <BaseCheckbox checked={selected} />
      </div>

      {/* COMPOSITION */}
      {itemComposition(item, selected)}

      <div className="absolute right-2 top-2 flex shrink-0 flex-col items-center justify-center">
        <Menu as="div" className="relative" onMouseDown={() => selectItem}>
          <Menu.Button
            className={`flex h-8 w-8 flex-col items-center justify-center rounded-md opacity-0 focus-within:outline-primary focus-visible:opacity-100 group-hover:opacity-100 ${
              selected ? 'text-primary hover:bg-primary/10' : 'text-gray-60 hover:bg-gray-10'
            }`}
          >
            <DotsThree size={24} weight="bold" />
          </Menu.Button>
          <Menu.Items>
            <div
              className="absolute right-0 z-20 mt-0 flex flex-col rounded-lg border border-gray-5 bg-white py-1.5 shadow-subtle-hard"
              style={{
                minWidth: '180px',
              }}
            >
              {menu?.map((option) => (
                <>
                  {option.separator ? (
                    <div className="my-0.5 flex w-full flex-row px-4">
                      <div className="h-px w-full bg-gray-10" />
                    </div>
                  ) : (
                    <Menu.Item disabled={option.disabled?.(item, selected)}>
                      {({ active }) => (
                        <div
                          onClick={() => option.action?.(item)}
                          className={`flex cursor-pointer flex-row whitespace-nowrap px-4 py-1.5 text-base ${
                            active
                              ? 'bg-primary text-white'
                              : option.disabled?.(item, selected)
                              ? 'text-gray-40'
                              : 'text-gray-60'
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
                </>
              ))}
            </div>
          </Menu.Items>
        </Menu>
      </div>
    </div>
  );
}
