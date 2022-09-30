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
  onClick?: () => void;
}

interface BreadcrumbsProps {
  items: BreadcrumbItemData[];
}

export default function Breadcrumbs(props: BreadcrumbsProps): JSX.Element {
  const MenuItem = forwardRef(({ children }: { children: ReactNode; }, ref) => {
    return (
      <div
        className="cursor-pointer items-center py-1 px-2 text-gray-80 hover:bg-gray-5 active:bg-gray-10"
      >
        {children}
      </div>
    );
  });

  const getItemsList = (): JSX.Element[] => {
    const items = props.items;
    const itemsList = [] as JSX.Element[];
    const hiddenItemsList = [] as JSX.Element[];
    const breadcrumbSeparator = (key) => { return <div key={key} className='flex items-center text-gray-50'><CaretRight className="h-5 w-5" /></div>; };

    for (let i = 0; i < items.length; i++) {
      if (items.length > 3 && i !== 0 && i < items.length - 1) {
        if (i === 1) {
          itemsList.push(breadcrumbSeparator('breadcrumbSeparator-' + items[i].id));
        }
        hiddenItemsList.push(<MenuItem><BreadcrumbsItem key={'breadcrumbItem' + items[i].id} item={items[i]} isHiddenInList totalBreadcrumbsLength={items.length} /></MenuItem>);
      } else {
        itemsList.push(<BreadcrumbsItem key={'breadcrumbItem' + items[i].id} item={items[i]} totalBreadcrumbsLength={items.length} />);
        if (i < items.length - 1) {
          itemsList.push(breadcrumbSeparator('breadcrumbSeparator-' + items[i].id));
        }
      }
    }

    if (hiddenItemsList.length > 0) {
      const menu = <Dropdown
        key="breadcrumbDropdownItems"
        classButton="mx-1 flex items-center justify-center transition-all duration-75 ease-in-out"
        openDirection="left"
        classMenuItems="left-1 mt-10 w-max rounded-md border border-black border-opacity-8 bg-white py-1.5 drop-shadow"
        menuItems={hiddenItemsList}
      >
        {({ open }) => {
          return (
            <>
              <DotsThree className={`h-7 w-7 rounded-full text-gray-80 hover:bg-gray-5 ${open ? 'bg-gray-5' : ''}`} />
            </>
          );
        }}
      </Dropdown>;
      itemsList.splice(2, 0, menu);
    }

    return itemsList;
  };

  return <>{<div className="flex w-full">{getItemsList()}</div>}</>;
};
