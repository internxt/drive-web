import usersIcon from 'assets/icons/users.svg';
import { t } from 'i18next';
import { useCallback } from 'react';
import dateService from '../../../../core/services/date.service';
import { OrderDirection } from '../../../../core/types';
import iconService from '../../../../drive/services/icon.service';
import sizeService from '../../../../drive/services/size.service';
import { DriveFileData } from '../../../../drive/types';
import { AdvancedSharedItem } from '../../../types';
import { Avatar, List, MenuItemType } from '@internxt/ui';

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

  const itemComposition = getSharedListItemComposition({
    onItemDoubleClicked,
    onNameClicked,
    user,
    getOwnerAvatarSrc,
    checkIfIsItemSelected,
  });

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
      itemComposition={itemComposition}
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

const getSharedListItemComposition = ({
  onItemDoubleClicked,
  onNameClicked,
  user,
  getOwnerAvatarSrc,
  checkIfIsItemSelected,
}) => [
  (shareItem: AdvancedSharedItem) => (
    <ShareItemNameField shareItem={shareItem} onItemDoubleClicked={onItemDoubleClicked} onNameClicked={onNameClicked} />
  ),
  (shareItem: AdvancedSharedItem) => (
    <ShareItemOwnerField
      shareItem={shareItem}
      user={user}
      ownerAvatarSrc={getOwnerAvatarSrc(shareItem)}
      isItemSelected={checkIfIsItemSelected(shareItem)}
    />
  ),
  (shareItem: AdvancedSharedItem) => <ShareItemSizeField shareItem={shareItem} />,
  (shareItem: AdvancedSharedItem) => (
    <ShareItemCreatedField shareItem={shareItem} isItemSelected={checkIfIsItemSelected(shareItem)} />
  ),
];

const ShareItemNameField = ({ shareItem, onItemDoubleClicked, onNameClicked }) => {
  const Icon = iconService.getItemIcon(shareItem.isFolder, (shareItem as unknown as DriveFileData)?.type);

  return (
    <div className={'flex h-full w-full flex-row items-center space-x-4 overflow-hidden'}>
      <div className="relative flex h-10 w-10 shrink items-center justify-center">
        <Icon className="flex h-full justify-center drop-shadow-soft" />
        {shareItem.dateShared && (
          <div className="absolute -bottom-0.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white ring-2 ring-surface">
            <img src={usersIcon} width={13} alt="shared users" />
          </div>
        )}
      </div>
      <button
        className="w-full max-w-full truncate pr-16 text-left"
        onDoubleClick={() => onItemDoubleClicked(shareItem)}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNameClicked(shareItem);
          }}
          className="w-fit max-w-full flex-1 cursor-pointer flex-row truncate whitespace-nowrap text-left"
          title={shareItem.plainName}
        >
          {shareItem.plainName}
          {!shareItem.isFolder && shareItem.type && '.' + shareItem.type}
        </button>
      </button>
    </div>
  );
};

const ShareItemOwnerField = ({
  shareItem,
  user,
  ownerAvatarSrc,
  isItemSelected,
}: {
  shareItem: AdvancedSharedItem;
  user: AdvancedSharedItem['user'] | undefined;
  ownerAvatarSrc: string | null;
  isItemSelected: boolean;
}) => (
  <div className="flex flex-row items-center justify-center">
    <div className="mr-2">
      <Avatar
        diameter={28}
        fullName={
          shareItem.user?.name
            ? `${shareItem.user?.name} ${shareItem.user?.lastname}`
            : `${user?.name} ${user?.lastname}`
        }
        src={ownerAvatarSrc}
      />
    </div>
    <span className={`${isItemSelected ? 'text-gray-100' : 'text-gray-60'}`}>
      {shareItem.user ? (
        <span>{`${shareItem.user?.name} ${shareItem.user?.lastname}`}</span>
      ) : (
        <span>{`${user?.name} ${user?.lastname}`}</span>
      )}{' '}
    </span>
  </div>
);

const ShareItemSizeField = ({ shareItem }: { shareItem: AdvancedSharedItem }) =>
  shareItem.isFolder ? (
    <span className="opacity-25">—</span>
  ) : (
    <span>{`${sizeService.bytesToString(shareItem?.size ? shareItem.size : 0, false)}`}</span>
  );

const ShareItemCreatedField = ({
  shareItem,
  isItemSelected,
}: {
  shareItem: AdvancedSharedItem;
  isItemSelected: boolean;
}) => (
  <span className={`${isItemSelected ? 'text-gray-100' : 'text-gray-60'}`}>
    {dateService.format(shareItem.createdAt, 'D MMM YYYY')}
  </span>
);
