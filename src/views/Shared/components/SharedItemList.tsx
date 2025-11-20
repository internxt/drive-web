import { t } from 'i18next';
import { useCallback } from 'react';
import { OrderDirection } from '../../../app/core/types';
import { AdvancedSharedItem } from '../../../app/share/types';
import { List, MenuItemType } from '@internxt/ui';
import { SharedListItem } from './SharedListItem';

const skinSkeleton = [
  <div key="1" className="flex flex-row items-center space-x-4">
    <div key="2" className="h-8 w-8 rounded-md bg-gray-5" />
    <div key="3" className="h-4 w-40 rounded bg-gray-5" />
  </div>,
  <div key="4" className="h-4 w-20 rounded bg-gray-5" />,
  <div key="5" className="h-4 w-24 rounded bg-gray-5" />,
  <div key="6" className="h-4 w-20 rounded bg-gray-5" />,
];

export type OrderField = 'name' | 'updatedAt' | 'createdAt' | 'size';

type SharedListItem = {
  onClickItem: (item) => void;
  keyBoardShortcutActions: {
    onRKeyPressed: () => void;
    onBackspaceKeyPressed: () => void;
  };
  emptyStateElement: JSX.Element;
  shareItems: AdvancedSharedItem[];
  isLoading: boolean;
  disableKeyboardShortcuts;
  selectedItems: AdvancedSharedItem[];
  onSelectedItemsChanged: (changes: { props: AdvancedSharedItem; value: boolean }[]) => void;
  onItemDoubleClicked: (shareItem: AdvancedSharedItem) => void;
  onNameClicked: (shareItem: AdvancedSharedItem) => void;
  onNextPage: () => void;
  hasMoreItems: boolean;
  contextMenu: Array<MenuItemType<AdvancedSharedItem>> | undefined;
  currentShareOwnerAvatar: string;
  user?: AdvancedSharedItem['user'];
  orderBy?: { field: OrderField; direction: OrderDirection };
  sortBy: (value: { field: OrderField; direction: 'ASC' | 'DESC' }) => void;
};

export const SharedItemList = ({
  onClickItem,
  keyBoardShortcutActions,
  emptyStateElement,
  shareItems,
  isLoading,
  disableKeyboardShortcuts,
  selectedItems,
  onSelectedItemsChanged,
  onItemDoubleClicked,
  onNameClicked,
  onNextPage,
  hasMoreItems,
  contextMenu,
  currentShareOwnerAvatar,
  user,
  orderBy,
  sortBy,
}: SharedListItem) => {
  const getOwnerAvatarSrc = useCallback(
    (shareItem: AdvancedSharedItem): string | null => {
      if (currentShareOwnerAvatar) {
        return currentShareOwnerAvatar;
      }
      return shareItem.user?.avatar ? shareItem.user?.avatar : null;
    },
    [currentShareOwnerAvatar],
  );

  const checkIfIsItemSelected = (item: AdvancedSharedItem) => {
    return selectedItems.some((i) => item.id === i.id);
  };

  const itemComposition = (item: AdvancedSharedItem) => (
    <SharedListItem
      item={item}
      getOwnerAvatarSrc={getOwnerAvatarSrc}
      isItemSelected={checkIfIsItemSelected(item)}
      onItemDoubleClicked={onItemDoubleClicked}
      onNameClicked={onNameClicked}
      user={user}
      onClickItem={onClickItem}
    />
  );

  return (
    <List<AdvancedSharedItem, OrderField>
      header={[
        {
          label: t('shared-links.list.name'),
          width: 'flex-1 min-w-activity truncate whitespace-nowrap',
          name: 'name',
          orderable: true,
          defaultDirection: 'ASC',
        },
        {
          label: t('shared-links.list.owner'),
          width: 'w-64',
          name: 'user',
          orderable: false,
        },
        {
          label: t('shared-links.list.size'),
          width: 'w-40',
          name: 'size',
          orderable: true,
          defaultDirection: 'ASC',
        },
        {
          label: t('shared-links.list.created'),
          width: 'w-40',
          name: 'createdAt',
          orderable: true,
          defaultDirection: 'ASC',
        },
      ]}
      items={shareItems}
      isLoading={isLoading}
      disableKeyboardShortcuts={disableKeyboardShortcuts}
      onClick={onClickItem}
      onDoubleClick={onItemDoubleClicked}
      itemComposition={[itemComposition]}
      skinSkeleton={skinSkeleton}
      emptyState={emptyStateElement}
      onNextPage={onNextPage}
      hasMoreItems={hasMoreItems}
      menu={contextMenu}
      displayMenuDiv
      keyBoardShortcutActions={keyBoardShortcutActions}
      selectedItems={selectedItems}
      keyboardShortcuts={['unselectAll', 'selectAll', 'multiselect']}
      onSelectedItemsChanged={onSelectedItemsChanged}
      orderBy={orderBy}
      onOrderByChanged={sortBy}
    />
  );
};
