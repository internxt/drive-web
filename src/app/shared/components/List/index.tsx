import ListItem from './ListItem';
import SkinSkeletonItem from './SkinSketelonItem';
import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Check, Minus } from 'phosphor-react';

interface HeaderProps {
  name: string;
  width: string;
  data: string;
  order: () => void;
  defaultDirection?: string;
}

interface ListProps {
  header: Array<HeaderProps> | Array<any>;
  items: Array<Record<string, unknown>> | Array<any>;
  itemComposition: Array<(props: Record<string, unknown>, active: boolean) => JSX.Element>;
  selectedItems: any;
  isLoading?: boolean;
  skinSkeleton?: Array<JSX.Element>;
  className?: string;
  keyboardShortcuts?: Array<'selectAll' | 'unselectAll' | Array<'delete' & (() => void)>>;
}

export default function List({
  header,
  items,
  itemComposition,
  isLoading,
  skinSkeleton,
  className,
  selectedItems,
  keyboardShortcuts,
}: ListProps): JSX.Element {
  // Default values
  const defaultOrderDirection: 'asc' | 'desc' = header.filter((column) => column.defaultDirection)[0][
    'defaultDirection'
  ];
  const defaultOrderCriteria = header.filter((column) => column.defaultDirection)[0]['order'];
  const defaultOrderData: string = header.filter((column) => column.defaultDirection)[0]['data'];

  // List states
  const [itemList, setItemList] = useState<Array<Record<string, unknown>>>(items);
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>(defaultOrderDirection);
  const [orderData, setOrderData] = useState<string>(defaultOrderData);
  const [itemsSelected, setItemsSelected] = useState<Array<Record<string, unknown>>>([]);

  // Keyboard shortcuts
  useEffect(() => {
    const listener = (e) => {
      if (!isLoading) {
        if (e.code === 'Escape') {
          if (keyboardShortcuts?.includes('unselectAll')) {
            unselectAllItems();
          }
        } else if (e.metaKey && e.code === 'KeyA') {
          // Select all items
          if (keyboardShortcuts?.includes('selectAll')) {
            e.preventDefault();
            selectAllItems();
          }
        }
      }
    };

    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [items]);

  useEffect(() => {
    if (orderDirection === 'asc') {
      setItemList([...itemList.sort((a, b) => defaultOrderCriteria(a, b))]);
    } else {
      setItemList([...itemList.sort((a, b) => defaultOrderCriteria(a, b)).reverse()]);
    }
  }, []);

  const selectItems = (list) => {
    setItemsSelected(list);
    selectedItems(list);
  };

  // Order list by criteria(< || >) and data (name, date, number...)
  const order = (criteria, data) => {
    if (data === orderData) {
      setOrderDirection(orderDirection === 'asc' ? 'desc' : 'asc');
      setItemList([...itemList.reverse()]);
    } else {
      setOrderData(data);
      if (orderDirection === 'asc') {
        setItemList([...itemList.sort((a, b) => criteria(a, b))]);
      } else {
        setItemList([...itemList.sort((a, b) => criteria(a, b)).reverse()]);
      }
    }
  };

  const isItemSelected = (item) => {
    return itemsSelected.some((i: Record<string, unknown>) => item.id === i.id);
  };

  const selectItem = (item) => {
    const itemIndex = itemsSelected.findIndex((i: Record<string, unknown>) => item.id === i.id);
    if (itemIndex < 0) {
      selectItems([...itemsSelected, item]);
    } else {
      const arr = itemsSelected;
      arr.splice(itemIndex, 1);
      selectItems([...arr]);
    }
  };

  const toggleSelectAllItems = () => {
    if (!(itemList.length === itemsSelected.length)) {
      selectAllItems();
    } else {
      unselectAllItems();
    }
  };

  const selectAllItems = () => {
    selectItems([...itemList]);
  };

  const unselectAllItems = () => {
    selectItems([]);
  };

  return (
    <>
      {/* TABLE */}
      <div
        className={`relative flex h-full flex-col ${isLoading && 'pointer-events-none overflow-y-hidden'} ${className}`}
      >
        {/* HEAD */}
        <div className="sticky flex h-12 flex-shrink-0 flex-row items-center px-5">
          {/* COLUMN */}
          <div className="relative flex h-full min-w-full flex-row items-center border-b border-gray-10 pl-9">
            {/* SELECTION CHECKBOX */}
            <div
              onClick={() => {
                if (itemList.length > itemsSelected.length && itemsSelected.length > 0) {
                  unselectAllItems();
                } else {
                  toggleSelectAllItems();
                }
              }}
              className={`absolute left-0 my-auto flex h-4 w-4 cursor-pointer flex-col items-center justify-center rounded text-white ${
                itemsSelected.length > 0 ? 'bg-primary' : 'border border-gray-20'
              }`}
            >
              {itemList.length > itemsSelected.length && itemsSelected.length > 0 ? (
                <Minus size={14} weight="bold" />
              ) : (
                <Check size={14} weight="bold" />
              )}
            </div>
            {header.map((column) => (
              <div
                onClick={() => order(column.order, column.data)}
                key={column.name}
                className={`flex h-full flex-shrink-0 cursor-pointer flex-row items-center space-x-1.5 text-base font-medium text-gray-60 hover:text-gray-80 ${column.width}`}
              >
                <span>{column.name}</span>
                {column.data === orderData &&
                  (orderDirection === 'asc' ? (
                    <ArrowUp size={14} weight="bold" />
                  ) : (
                    <ArrowDown size={14} weight="bold" />
                  ))}
              </div>
            ))}
          </div>
        </div>

        {/* BODY */}
        <div className={`h-full ${!isLoading && 'overflow-y-auto'} pb-12`}>
          {!isLoading && itemList.length > 0 ? (
            <>
              {itemList.map((item) => (
                <ListItem
                  key={JSON.stringify(item)}
                  onClick={() => selectItem(item)}
                  item={item}
                  itemComposition={itemComposition}
                  selected={isItemSelected(item)}
                  columns={header.map((column) => column.width)}
                />
              ))}
            </>
          ) : (
            <>
              {new Array(32).fill(0).map((col, i) => (
                <SkinSkeletonItem key={i} skinSkeleton={skinSkeleton} columns={header.map((column) => column.width)} />
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}
