import GridItem from './GridItem';
import SkinSkeletonItem from './SkinSketelonItem';
import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown } from '@phosphor-icons/react';
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
  itemComposition: (props: Record<string, unknown>, active: boolean) => JSX.Element;
  selectedItems: any;
  onDoubleClick?: (props?: any) => any;
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
  keyboardShortcuts?: Array<'selectAll' | 'unselectAll' | 'multiselect' | Array<'delete' & (() => void)>>;
  disableKeyboardShortcuts?: boolean;
}

export default function List({
  header,
  items,
  itemComposition,
  selectedItems,
  onDoubleClick,
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
  const [itemsSelected, setItemsSelected] = useState<Array<Record<string, unknown>>>([]);
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>(defaultOrderDirection);
  const [orderData, setOrderData] = useState<string>(defaultOrderData);
  const [multiSelection, setMultiSelection] = useState<boolean>(false);
  const [multiSelectionRange, setMultiSelectionRange] = useState<boolean>(false);
  const [multiSelectionRangeFrom, setMultiSelectionRangeFrom] = useState<number | null>(0);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDownListener = (e) => {
      if ((!disableKeyboardShortcuts ?? true) && !isLoading) {
        if (e.code === 'Escape' && keyboardShortcuts?.includes('unselectAll')) {
          unselectAllItems();
        } else if ((e.metaKey || e.ctrlKey) && e.code === 'KeyA' && keyboardShortcuts?.includes('selectAll')) {
          // Prevent default ⌘A behaviour
          e.preventDefault();
          selectAllItems();
        } else if ((e.metaKey || e.ctrlKey) && keyboardShortcuts?.includes('multiselect')) {
          setMultiSelection(true);
        } else if (e.shiftKey && keyboardShortcuts?.includes('multiselect')) {
          setMultiSelectionRange(true);
        }
      }
    };

    const onKeyUpListener = (e) => {
      if ((!disableKeyboardShortcuts ?? true) && !isLoading) {
        if (
          (e.code === 'MetaLeft' || e.code === 'MetaRight' || e.code === 'ControlLeft' || e.code === 'ControlRight') &&
          keyboardShortcuts?.includes('multiselect')
        ) {
          setMultiSelection(false);
        } else if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && keyboardShortcuts?.includes('multiselect')) {
          setMultiSelectionRange(false);
        }
      }
    };

    document.addEventListener('keydown', onKeyDownListener);
    document.addEventListener('keyup', onKeyUpListener);

    return () => {
      document.removeEventListener('keydown', onKeyDownListener);
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
    return itemsSelected.some((i) => item.id === i.id);
  };

  const sliceItems = (from, to) => {
    if (from < to) {
      return itemList.slice(from, to + 1);
    } else if (from > to) {
      return itemList.slice(to, from + 1);
    } else {
      return [itemList[from]];
    }
  };

  const selectItem = (item) => {
    const isSelected = itemsSelected.findIndex((i) => item.id === i.id) < 0;
    const itemIndex = itemList.findIndex((i) => item.id === i.id);

    if (!multiSelectionRange) {
      setMultiSelectionRangeFrom(itemIndex);
    }

    if (isSelected) {
      if (multiSelectionRange) {
        selectItems([...itemsSelected, ...sliceItems(multiSelectionRangeFrom, itemIndex)]);
      } else if (multiSelection) {
        selectItems([...itemsSelected, item]);
      } else {
        selectItems([item]);
      }
    }
  };

  const unselectItem = (item) => {
    if (itemsSelected.length > 1) {
      if (multiSelection) {
        selectItems([...itemsSelected.filter((i) => item.id !== i.id)]);
      } else {
        const itemIndex = itemList.findIndex((i) => item.id === i.id);
        if (multiSelectionRange) {
          if (itemsSelected.length === itemList.length) {
            selectItems([...sliceItems(multiSelectionRangeFrom, itemIndex)]);
          } else {
            selectItems([...itemsSelected, ...sliceItems(multiSelectionRangeFrom, itemIndex)]);
          }
        } else {
          setMultiSelectionRangeFrom(itemIndex);
          selectItems([item]);
        }
      }
    }

    // Reset setMultiSelectionRangeFrom
    if (itemsSelected.length === 0) {
      setMultiSelectionRangeFrom(0);
    }
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
    setMultiSelectionRangeFrom(itemList.length);
    selectItems([...itemList]);
  };

  const unselectAllItems = () => {
    selectItems([]);
    setMultiSelectionRangeFrom(0);
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
        {/* Click outside of the list to unselect all items */}
        {itemList.length > 0 && <div className="absolute left-0 top-0 z-0 h-full w-full" onClick={unselectAllItems} />}

        {!isLoading && itemList.length > 0 && (
          <>
            {/* HEAD */}
            <div className="sticky flex h-12 shrink-0 flex-row items-center px-5">
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
                    className={`flex h-full shrink-0 cursor-pointer flex-row items-center space-x-1.5 text-base font-medium text-gray-60 hover:text-gray-80 ${column.width}`}
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

                {menu && <div className="flex h-14 w-12 shrink-0" />}
              </div>
            </div>
          </>
        )}

        {/* BODY */}
        <div
          className={`2xl:grid-cols-7 grid h-full grid-flow-row grid-cols-1 content-start gap-3 p-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 ${
            !isLoading && 'overflow-y-auto'
          }`}
        >
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
                    <GridItem
                      key={JSON.stringify(item)}
                      item={item}
                      itemComposition={itemComposition}
                      selected={isItemSelected(item)}
                      onDoubleClick={onDoubleClick}
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
        </div>
      </div>
    </>
  );
}
