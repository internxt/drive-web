import { CaretRight, DotsThree } from 'phosphor-react';
import { forwardRef, ReactNode } from 'react';
import Dropdown from '../Dropdown';
import BreadcrumbsItem from './BreadcrumbsItem/BreadcrumbsItem';

export interface BreadcrumbItemData {
  id: number;
  label: string;
  icon: JSX.Element | null;
  active: boolean;
  isFirstPath?: boolean;
  dialog?: boolean;
  isBackup?: boolean;
  onClick?: () => void;
}

interface BreadcrumbsProps {
  items: BreadcrumbItemData[];
}

export default function Breadcrumbs(props: BreadcrumbsProps): JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const MenuItem = forwardRef(({ children }: { children: ReactNode }, ref) => {
    return (
      <div className="flex cursor-pointer items-center hover:bg-gray-5 hover:text-gray-80 active:bg-gray-10">
        {children}
      </div>
    );
  });

  const getItemsList = (): JSX.Element[] => {
    const items = props.items;
    const itemsList = [] as JSX.Element[];
    const hiddenItemsList = [] as JSX.Element[];
    const breadcrumbSeparator = (key) => {
      return (
        <div key={key} className="flex items-center text-gray-50">
          <CaretRight weight="bold" className="h-4 w-4" />
        </div>
      );
    };

    for (let i = 0; i < items.length; i++) {
      if (items.length > 3 && i !== 0 && i < items.length - 2) {
        if (i === 1) {
          itemsList.push(breadcrumbSeparator('breadcrumbSeparator-' + items[i].id));
        }
        hiddenItemsList.push(
          <MenuItem>
            <BreadcrumbsItem
              key={'breadcrumbItem' + items[i].id}
              item={items[i]}
              isHiddenInList
              totalBreadcrumbsLength={items.length}
              items={items}
            />
          </MenuItem>,
        );
      } else {
        itemsList.push(
          <BreadcrumbsItem
            key={'breadcrumbItem' + items[i].id}
            item={items[i]}
            totalBreadcrumbsLength={items.length}
            items={items}
          />,
        );
        if (i < items.length - 1) {
          itemsList.push(breadcrumbSeparator('breadcrumbSeparator-' + items[i].id));
        }
      }
    }

    if (hiddenItemsList.length > 0) {
      const menu = (
        <Dropdown
          key="breadcrumbDropdownItems"
          openDirection="left"
          classMenuItems="left-0 top-1 w-max max-h-80 overflow-y-auto rounded-md border border-black border-opacity-8 bg-white py-1.5 shadow-subtle-hard"
          menuItems={hiddenItemsList}
        >
          {({ open }) => {
            return (
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-gray-60 transition-all duration-75 ease-in-out hover:bg-gray-5 hover:text-gray-80 ${
                  open ? 'bg-gray-5' : ''
                }`}
              >
                <DotsThree weight="bold" className="h-5 w-5" />
              </div>
            );
          }}
        </Dropdown>
      );
      itemsList.splice(2, 0, menu);
    }

    return itemsList;
  };

  return <div className="flex w-full items-center">{getItemsList()}</div>;
}
