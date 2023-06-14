import ListItem, { ListItemMenu } from './ListItem';
import SkinSkeletonItem from './SkinSketelonItem';
import React, { ReactNode, useEffect, useCallback, useLayoutEffect, useState } from 'react';
import { ArrowUp, ArrowDown } from 'phosphor-react';
import BaseCheckbox from 'app/shared/components/forms/BaseCheckbox/BaseCheckbox';
import InfiniteScroll from 'react-infinite-scroll-component';
import _ from 'lodash';
import { useHotkeys } from 'react-hotkeys-hook';

type HeaderProps<T, F> = {
  label: string;
  width: string;
} & ({ name: F; orderable: true; defaultDirection: 'ASC' | 'DESC' } | { name: keyof T; orderable: false });

interface ListProps<T, F> {
  header: HeaderProps<T, F>[];
  items: T[];
  itemComposition: Array<(props: T) => JSX.Element>;
  selectedItems: T[];
  onClick?: (props: T) => void;
  onDoubleClick?: (props: T) => void;
  onEnterPressed?: (props: T) => void;
  onSelectedItemsChanged: (changes: { props: T; value: boolean }[]) => void;
  isLoading?: boolean;
  skinSkeleton?: Array<JSX.Element>;
  emptyState?: ReactNode;
  onNextPage?: () => void;
  onOrderByChanged?: (value: { field: F; direction: 'ASC' | 'DESC' }) => void;
  orderBy?: { field: F; direction: 'ASC' | 'DESC' };
  hasMoreItems?: boolean;
  menu?: ListItemMenu<T>;
  className?: string;
  keyboardShortcuts?: Array<'selectAll' | 'unselectAll' | 'multiselect' | Array<'delete' & (() => void)>>;
  disableKeyboardShortcuts?: boolean;
  disableItemCompositionStyles?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  keyBoardShortcutActions?: {
    onShiftFKeysPressed?: () => void;
    onRKeyPressed?: () => void;
    onBackspaceKeyPressed?: () => void;
  };
}

/**
 *
 * Generic arguments:
 * -T: Identifiable entity
 * -F: Orderable fields of the entity T for better typing in callbacks related to ordering
 *
 * "header" contains header items which can or cannot be orderable
 * "items" is an array of instances of T entity and the source of truth of what is printable on the list component
 * "itemComposition" given an item of type T, return how its printed on the list component
 * "onDoubleClick" triggered when an item is double clicked
 * "onSelectedItemsChanged" triggered when the set of selected items changes
 * "onNextPage" is triggered when the user gets to the end of the current printed items
 * "onOrderByChanged" is triggered when the user changes the way the list is ordered
 * "orderBy" is passed by a component higher in the herarchy which contains the state of what order is currently followed
 * "hasMoreItems" is passed by the component that is the source of truth for the fetching of items
 * "menu" contains the valid of options for an item of type T
 *
 * This component has no state in it. The state must be kept by an smarter component (higher in the herarchy)
 */
export default function List<T extends { id: any }, F extends keyof T>({
  header,
  items,
  itemComposition,
  selectedItems,
  onClick,
  onDoubleClick,
  onEnterPressed,
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
  disableItemCompositionStyles,
  onMouseEnter,
  onMouseLeave,
  keyBoardShortcutActions,
}: // keyboardShortcuts,
// disableKeyboardShortcuts,
ListProps<T, F>): JSX.Element {
  const [isScrollable, ref, node] = useIsScrollable([items]);
  const isItemSelected = (item: T) => {
    return selectedItems.some((i) => item.id === i.id);
  };

  const loader = new Array(25)
    .fill(0)
    .map((col, i) => (
      <SkinSkeletonItem
        key={`skinSkeletonRow${i}`}
        skinSkeleton={skinSkeleton}
        columns={header.map((column) => column.width)}
      />
    ));

  // Check if this is necessary, commented because it calls twice onNextPage
  // because InfiniteScroll already manage this case
  useEffect(() => {
    if (!node || isLoading) return;

    if (!isScrollable && hasMoreItems) {
      // onNextPage?.();
    }
  }, [isLoading, isScrollable, hasMoreItems, node]);

  const handleNexstPage = () => {
    onNextPage?.();
  };

  function unselectAllItems() {
    const changesToMake = selectedItems.map((item) => ({ props: item, value: false }));
    onSelectedItemsChanged(changesToMake);
  }

  function executeClickOnSelectedItem() {
    const oneItemSelected = selectedItems.length === 1;
    if (oneItemSelected) {
      const selectedItem = selectedItems[0];
      onEnterPressed?.(selectedItem);
    }
  }

  function unselectAllItemsAndSelectOne(props: T) {
    const changesToMake = [...selectedItems.map((item) => ({ props: item, value: false })), { props, value: true }];
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

  useHotkeys(
    'ctrl+a, cmd+a',
    (e) => {
      e.preventDefault();
      selectAllItems();
    },
    [items, selectedItems],
  );

  useHotkeys('esc', unselectAllItems, [selectedItems]);

  useHotkeys('enter', executeClickOnSelectedItem, [selectedItems]);

  const handleRKeyPressed = () => {
    keyBoardShortcutActions?.onRKeyPressed?.();
  };

  useHotkeys('r', handleRKeyPressed, [selectedItems]);

  const handleBackspaceKeyPressed = () => {
    keyBoardShortcutActions?.onBackspaceKeyPressed?.();
  };

  useHotkeys('backspace', handleBackspaceKeyPressed, [selectedItems]);

  function onItemClick(itemClicked: T, e: React.MouseEvent<HTMLDivElement>) {
    if (e.metaKey || e.ctrlKey) {
      onSelectedItemsChanged([{ props: itemClicked, value: !isItemSelected(itemClicked) }]);
    } else if (!isItemSelected(itemClicked)) {
      onClick?.(itemClicked);
    }
  }

  function onRightItemClick(props: T, e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!isItemSelected(props)) {
      unselectAllItemsAndSelectOne(props);
    }
  }

  return (
    <div id="generic-list-component" className={`relative flex h-full flex-col overflow-y-hidden ${className}`}>
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
              className={`flex h-full flex-shrink-0  flex-row items-center space-x-1.5 text-base font-medium text-gray-60  ${
                column.width
              } ${column.orderable ? 'cursor-pointer hover:text-gray-80' : ''}`}
            >
              <span>{column.label}</span>
              {column.name === orderBy?.field &&
                column.orderable &&
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
      <div id="scrollableList" className="flex h-full flex-col overflow-y-auto" ref={ref}>
        {(!hasMoreItems ?? false) && items.length === 0 && !isLoading ? (
          emptyState
        ) : items.length > 0 ? (
          <>
            <InfiniteScroll
              dataLength={items.length}
              next={handleNexstPage}
              hasMore={!!hasMoreItems}
              loader={loader}
              scrollThreshold={0.7}
              scrollableTarget="scrollableList"
              className="h-full"
              style={{ overflow: 'visible' }}
            >
              {items.map((item) => (
                <ListItem<T>
                  key={item.id}
                  item={item}
                  itemComposition={itemComposition}
                  selected={isItemSelected(item)}
                  onDoubleClick={onDoubleClick && (() => onDoubleClick(item))}
                  onClick={(e) => onItemClick(item, e)}
                  onClickContextMenu={(e) => onRightItemClick(item, e)}
                  onThreeDotsButtonPressed={(item) => {
                    if (!isItemSelected(item)) unselectAllItemsAndSelectOne(item);
                  }}
                  columnsWidth={header.map((column) => column.width)}
                  menu={menu}
                  onSelectedChanged={(value) => onSelectedItemsChanged([{ props: item, value }])}
                  disableItemCompositionStyles={disableItemCompositionStyles}
                  onMouseEnter={onMouseEnter}
                  onMouseLeave={onMouseLeave}
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
  );
}

const useIsScrollable = (dependencies: any[]) => {
  const [node, setNode] = useState<HTMLDivElement>();
  const ref = useCallback((node: HTMLDivElement) => {
    setNode(node);
  }, []);

  const [isScrollable, setIsScrollable] = useState<boolean>(false);

  useLayoutEffect(() => {
    if (!node) return;

    setIsScrollable(node.scrollHeight > node.clientHeight);
  }, [...dependencies, node]);

  useLayoutEffect(() => {
    if (!node) return;

    const handleWindowResize = () => {
      setIsScrollable(node.scrollHeight > node.clientHeight);
    };

    window.addEventListener('resize', handleWindowResize);

    return () => window.removeEventListener('resize', handleWindowResize);
  }, [node]);

  return [isScrollable, ref, node] as const;
};
