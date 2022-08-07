import ListItem, { ListItemMenu } from './ListItem';
import SkinSkeletonItem from './SkinSketelonItem';
import { ReactNode } from 'react';
import { ArrowUp, ArrowDown } from 'phosphor-react';
import BaseCheckbox from 'app/shared/components/forms/BaseCheckbox/BaseCheckbox';
import InfiniteScroll from 'react-infinite-scroll-component';
import _ from 'lodash';

type HeaderProps<T, F> = {
  label: string;
  width: string;
} & ({ name: F; orderable: true; defaultDirection: 'ASC' | 'DESC' } | { name: keyof T; orderable: false });

interface ListProps<T, F> {
  header: HeaderProps<T, F>[];
  items: T[];
  itemComposition: Array<(props: T) => JSX.Element>;
  selectedItems: T[];
  onDoubleClick?: (props: T) => void;
  onSelectedItemsChanged: (changes: { props: T; value: boolean }[]) => void;
  isLoading?: boolean;
  skinSkeleton?: Array<JSX.Element>;
  emptyState?: ReactNode;
  onNextPage: () => void;
  onOrderByChanged?: (value: { field: F; direction: 'ASC' | 'DESC' }) => void;
  orderBy?: { field: F; direction: 'ASC' | 'DESC' };
  hasMoreItems?: boolean;
  menu?: ListItemMenu<T>;
  className?: string;
  keyboardShortcuts?: Array<'selectAll' | 'unselectAll' | 'multiselect' | Array<'delete' & (() => void)>>;
  disableKeyboardShortcuts?: boolean;
}

export default function List<T extends { id: string }, F extends keyof T>({
  header,
  items,
  itemComposition,
  selectedItems,
  onDoubleClick,
  onSelectedItemsChanged,
  isLoading,
  skinSkeleton,
  emptyState,
  orderBy,
  onOrderByChanged,
  onNextPage,
  hasMoreItems,
  menu,
  className,
  keyboardShortcuts,
  disableKeyboardShortcuts,
}: ListProps<T, F>): JSX.Element {
  const isItemSelected = (item: T) => {
    return selectedItems.some((i) => item.id === i.id);
  };

  const loader = new Array(8)
    .fill(0)
    .map((col, i) => (
      <SkinSkeletonItem
        key={`skinSkeletonRow${i}`}
        skinSkeleton={skinSkeleton}
        columns={header.map((column) => column.width)}
      />
    ));

  function unselectAllItems() {
    const changesToMake = selectedItems.map((item) => ({ props: item, value: false }));
    onSelectedItemsChanged(changesToMake);
  }

  function selectAllItems() {
    const notSelectedItems = _.difference(items, selectedItems);
    const changesToMake = notSelectedItems.map((item) => ({ props: item, value: true }));
    onSelectedItemsChanged(changesToMake);
  }

  function onTopSelectionCheckboxClick() {
    const atLeastOneItemSelected = selectedItems.length !== 0;

    if (atLeastOneItemSelected) {
      unselectAllItems();
    } else {
      selectAllItems();
    }
  }

  function onOrderableColumnClicked(field: HeaderProps<T, F>) {
    if (!field.orderable || !onOrderByChanged) return;

    const columnWasAlreadySelected = orderBy?.field === field.name;
    if (columnWasAlreadySelected) {
      onOrderByChanged({ field: field.name, direction: orderBy.direction === 'ASC' ? 'DESC' : 'ASC' });
    } else {
      onOrderByChanged({ field: field.name, direction: field.defaultDirection ?? 'ASC' });
    }
  }

  return (
    <>
      {/* TABLE */}
      <div className={`relative flex h-full flex-col overflow-y-hidden ${className}`}>
        {/* HEAD */}
        <div className="relative flex h-12 flex-shrink-0 flex-row px-5">
          {/* COLUMN */}
          <div className="relative flex h-full min-w-full flex-row items-center border-b border-gray-10 pl-9">
            {/* SELECTION CHECKBOX */}
            <div className="absolute left-0 top-0 flex h-full w-0 flex-row items-center justify-start p-0">
              <BaseCheckbox
                checked={selectedItems.length > 0}
                indeterminate={items.length > selectedItems.length && selectedItems.length > 0}
                onClick={onTopSelectionCheckboxClick}
              />
            </div>

            {header.map((column) => (
              <div
                onClick={column.orderable ? () => onOrderableColumnClicked(column) : undefined}
                key={column.name.toString()}
                className={`flex h-full flex-shrink-0 cursor-pointer flex-row items-center space-x-1.5 text-base font-medium text-gray-60 hover:text-gray-80 ${column.width}`}
              >
                <span>{column.label}</span>
                {column.name === orderBy?.field &&
                  (orderBy?.direction === 'ASC' ? (
                    <ArrowUp size={14} weight="bold" />
                  ) : (
                    <ArrowDown size={14} weight="bold" />
                  ))}
              </div>
            ))}

            {menu && <div className="flex h-full w-12 flex-shrink-0" />}
          </div>
        </div>

        {/* BODY */}
        <div id="scrollableList" className="flex h-full flex-col overflow-y-auto">
          {(!hasMoreItems ?? false) && items.length === 0 ? (
            emptyState
          ) : items.length > 0 ? (
            <>
              <InfiniteScroll
                dataLength={items.length}
                next={onNextPage}
                hasMore={hasMoreItems ?? false}
                loader={loader}
                scrollableTarget="scrollableList"
                className="h-full"
              >
                {items.map((item) => (
                  <ListItem<T>
                    key={item.id}
                    item={item}
                    itemComposition={itemComposition}
                    selected={isItemSelected(item)}
                    onDoubleClick={onDoubleClick && (() => onDoubleClick(item))}
                    columnsWidth={header.map((column) => column.width)}
                    menu={menu}
                    onSelectedChanged={(value) => onSelectedItemsChanged([{ props: item, value }])}
                  />
                ))}
              </InfiniteScroll>
            </>
          ) : (
            <>{loader}</>
          )}

          {/* Click outside of the list to unselect all items */}
          {items.length > 0 && <div className="h-full w-full py-6" onClick={unselectAllItems} />}
        </div>
      </div>
    </>
  );
}
