import { CaretRight, DotsThree } from '@phosphor-icons/react';
import { forwardRef, ReactNode } from 'react';
import BreadcrumbsItem from './BreadcrumbsItem/BreadcrumbsItem';
import { BreadcrumbItemData, BreadcrumbsMenuProps } from './types';
import { Dropdown } from '@internxt/ui';

interface BreadcrumbsProps {
  items: BreadcrumbItemData[];
  rootBreadcrumbItemDataCy?: string;
  menu?: (props: BreadcrumbsMenuProps) => JSX.Element;
}

export default function Breadcrumbs(props: Readonly<BreadcrumbsProps>): JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const MenuItem = forwardRef(({ children }: { children: ReactNode }, ref) => {
    return (
      <div className="flex cursor-pointer items-center hover:bg-gray-5 hover:text-gray-80 dark:hover:bg-gray-10">
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
        <div key={key} className="text-dgray-50 flex items-center">
          <CaretRight weight="bold" className="h-4 w-4" />
        </div>
      );
    };

    for (let i = 0; i < items.length; i++) {
      const separatorKey = 'breadcrumbSeparator-' + items[i].uuid + i.toString();
      const itemKey = 'breadcrumbItem-' + items[i].uuid + i.toString();

      if (items.length > 3 && i !== 0 && i < items.length - 2) {
        if (i === 1) {
          itemsList.push(breadcrumbSeparator(separatorKey));
        }
        hiddenItemsList.push(
          <MenuItem>
            <BreadcrumbsItem
              key={itemKey}
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
            breadcrumbButtonDataCy={i === 0 ? props?.rootBreadcrumbItemDataCy : undefined}
            key={itemKey}
            item={items[i]}
            totalBreadcrumbsLength={items.length}
            items={items}
            menu={props.menu}
          />,
        );
        if (i < items.length - 1) {
          itemsList.push(breadcrumbSeparator(separatorKey));
        }
      }
    }

    if (hiddenItemsList.length > 0) {
      const menu = (
        <Dropdown
          key="breadcrumbDropdownItems"
          openDirection="left"
          classMenuItems="left-0 top-1 w-max max-h-80 overflow-y-auto rounded-md border border-gray-10 bg-surface dark:bg-gray-5 shadow-subtle-hard z-10"
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
