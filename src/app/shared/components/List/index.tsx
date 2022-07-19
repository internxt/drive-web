import ListItem from './ListItem';
import SkinSkeletonItem from './SkinSketelonItem';
import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown } from 'phosphor-react';
import BaseCheckbox from 'app/shared/components/forms/BaseCheckbox/BaseCheckbox';

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
  emptyState?: JSX.Element | (() => JSX.Element);
  menu?: Array<{
    separator?: boolean;
    name?: string;
    icon?: any;
    action?: (props: any) => void;
    disabled?: (props: any, selected: any) => boolean;
  }>;
  className?: string;
  keyboardShortcuts?: Array<'selectAll' | 'unselectAll' | Array<'delete' & (() => void)>>;
  disableKeyboardShortcuts?: boolean;
}

export default function List({
  header,
  items,
  itemComposition,
  selectedItems,
  isLoading,
  skinSkeleton,
  emptyState,
  menu,
  className,
  keyboardShortcuts,
  disableKeyboardShortcuts,
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
  const [multiSelection, setMultiSelection] = useState<boolean>(false);
  const [itemsSelected, setItemsSelected] = useState<Array<Record<string, unknown>>>([]);

  // Keyboard shortcuts
  useEffect(() => {
    const listener = (e) => {
      if ((!disableKeyboardShortcuts ?? true) && !isLoading) {
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
        } else if (e.metaKey) {
          setMultiSelection(true);
        }
      }
    };

    const onKeyUpListener = (e) => {
      if ((!disableKeyboardShortcuts ?? true) && !isLoading) {
        if (e.code === 'MetaLeft' || e.code === 'MetaRight') {
          setMultiSelection(false);
        }
      }
    };

    document.addEventListener('keydown', listener);
    document.addEventListener('keyup', onKeyUpListener);
    return () => {
      document.removeEventListener('keydown', listener);
      document.removeEventListener('keyup', onKeyUpListener);
    };
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
      if (multiSelection) {
        selectItems([...itemsSelected, item]);
      } else {
        selectItems([item]);
      }
    }
  };

  const unselectItem = (item) => {
    const itemIndex = itemsSelected.findIndex((i: Record<string, unknown>) => item.id === i.id);
    const arr = itemsSelected;
    arr.splice(itemIndex, 1);
    selectItems([...arr]);
  };

  const toggleSelectItem = (item) => {
    if (isItemSelected(item)) {
      unselectItem(item);
    } else {
      selectItem(item);
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

  const bulkItemsSelectionToggle = () => {
    if (itemList.length > itemsSelected.length && itemsSelected.length > 0) {
      unselectAllItems();
    } else {
      toggleSelectAllItems();
    }
  };

  return (
    <>
      {/* TABLE */}
      <div
        className={`relative flex h-full flex-col ${isLoading && 'pointer-events-none overflow-y-hidden'} ${className}`}
      >
        {!isLoading && itemList.length > 0 && (
          <>
            {/* HEAD */}
            <div className="sticky flex h-12 flex-shrink-0 flex-row items-center px-5">
              {/* COLUMN */}
              <div className="relative flex h-full min-w-full flex-row items-center border-b border-gray-10 pl-9">
                {/* SELECTION CHECKBOX */}
                <div className="absolute left-0 top-0 flex h-full w-0 flex-row items-center justify-start p-0">
                  <BaseCheckbox
                    checked={itemsSelected.length > 0}
                    onClick={bulkItemsSelectionToggle}
                    indeterminate={itemList.length > itemsSelected.length && itemsSelected.length > 0}
                  />
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

                {menu && <div className="flex h-14 w-12 flex-shrink-0" />}
              </div>
            </div>
          </>
        )}

        {/* BODY */}
        <div className={`flex h-full flex-col ${!isLoading && 'overflow-y-auto'}`}>
          {isLoading ? (
            <>
              {new Array(32).fill(0).map((col, i) => (
                <SkinSkeletonItem key={i} skinSkeleton={skinSkeleton} columns={header.map((column) => column.width)} />
              ))}
            </>
          ) : (
            <>
              {itemList.length > 0 ? (
                <>
                  {itemList.map((item) => (
                    <ListItem
                      key={JSON.stringify(item)}
                      item={item}
                      itemComposition={itemComposition}
                      selected={isItemSelected(item)}
                      columns={header.map((column) => column.width)}
                      toggleSelectItem={() => toggleSelectItem(item)}
                      selectItem={() => selectItem(item)}
                      menu={menu}
                    />
                  ))}
                </>
              ) : (
                <>{emptyState}</>
              )}
            </>
          )}

          <div className="h-full w-full py-6" onClick={unselectAllItems} />
        </div>
      </div>
    </>
  );
}
