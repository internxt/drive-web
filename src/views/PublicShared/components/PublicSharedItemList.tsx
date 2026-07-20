import { items } from '@internxt/lib';
import { Thumbnail } from '@internxt/sdk/dist/drive/storage/types';
import { Empty, List, MenuItemType } from '@internxt/ui';
import { OrderDirection } from 'app/core/types';
import iconService from 'app/drive/services/icon.service';
import transformItemService from 'app/drive/services/item-transform.service';
import sizeService from 'app/drive/services/size.service';
import { downloadPublicThumbnail } from 'app/drive/services/thumbnail.service';
import { DriveItemData } from 'app/drive/types';
import { thumbnailableImageExtension } from 'app/drive/types/file-types';
import { FileKey } from 'app/network/types/helper-types';
import { AdvancedSharedItem } from 'app/share/types';
import folderEmptyImage from 'assets/icons/light/folder-open.svg';
import { t } from 'i18next';
import { useEffect, useState } from 'react';
import errorService from 'services/error.service';
import { OrderField } from 'views/Shared/components/SharedItemList';

const skinSkeleton = [
  <div key="1" className="flex flex-row items-center space-x-4">
    <div key="2" className="h-8 w-8 rounded-md bg-gray-5" />
    <div key="3" className="h-4 w-40 rounded bg-gray-5" />
  </div>,
  <div key="4" className="h-4 w-20 rounded bg-gray-5" />,
];

type PublicSharedListItemProps = {
  item: AdvancedSharedItem;
  publicShareKey: FileKey;
  onNameClicked: (shareItem: AdvancedSharedItem) => void;
};

const PublicSharedListItem = ({ item, publicShareKey, onNameClicked }: PublicSharedListItemProps) => {
  const ItemIconComponent = iconService.getItemIcon(item.isFolder, item.type);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>();
  const displayName =
    transformItemService.getItemPlainNameWithExtension(item as unknown as DriveItemData) ??
    items.getItemDisplayName(item);

  useEffect(() => {
    const thumbnail = (item.thumbnails as Thumbnail[] | undefined)?.[0];
    const isImage = !item.isFolder && !!item.type && thumbnailableImageExtension.includes(item.type.toLowerCase());
    if (!thumbnail || !isImage || !item.credentials) return;

    let objectUrl: string | undefined;
    let isUnmounted = false;

    downloadPublicThumbnail(
      thumbnail,
      { user: item.credentials.networkUser, pass: item.credentials.networkPass },
      publicShareKey,
    )
      .then((thumbnailBlob) => {
        objectUrl = URL.createObjectURL(thumbnailBlob);
        if (isUnmounted) {
          URL.revokeObjectURL(objectUrl);
        } else {
          setThumbnailUrl(objectUrl);
        }
      })
      .catch((error) => errorService.reportError(error));

    return () => {
      isUnmounted = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item]);

  return (
    <div
      className="group relative flex w-full grow flex-row items-center text-base"
      data-test={`file-list-${item.isFolder ? 'folder' : 'file'}`}
    >
      {/* ITEM NAME */}
      <div className="flex min-w-[200px] grow shrink-0 items-center truncate whitespace-nowrap pr-3">
        {/* ICON */}
        <div className="box-content flex items-center pr-4">
          <div className="flex h-10 w-10 justify-center drop-shadow-soft">
            {thumbnailUrl ? (
              <div className="h-full w-full">
                <img
                  className="aspect-square h-full max-h-full object-contain object-center"
                  src={thumbnailUrl}
                  alt={displayName}
                  data-test={`file-list-${item.isFolder ? 'folder' : 'file'}-image`}
                />
              </div>
            ) : (
              <ItemIconComponent
                className="h-full"
                data-test={`file-list-${item.isFolder ? 'folder' : 'file'}-${displayName}`}
              />
            )}
          </div>
        </div>

        {/* NAME */}
        <div className="flex w-[200px] grow cursor-pointer items-center truncate pr-2">
          <button
            data-test={`${item.isFolder ? 'folder' : 'file'}-name`}
            className="truncate"
            title={displayName}
            onClick={(e) => {
              e.stopPropagation();
              onNameClicked(item);
            }}
          >
            <p className="truncate">{displayName}</p>
          </button>
        </div>
      </div>

      {/* SIZE */}
      <div className="block w-40 shrink-0 items-center whitespace-nowrap">
        {sizeService.bytesToString(item.size, false) === '' || item.isFolder ? (
          <span className="opacity-25">—</span>
        ) : (
          sizeService.bytesToString(item.size, false)
        )}
      </div>
    </div>
  );
};

type PublicSharedItemListProps = {
  shareItems: AdvancedSharedItem[];
  publicShareKey: FileKey;
  isLoading: boolean;
  hasMoreItems: boolean;
  onNextPage: () => void;
  onClickItem: (shareItem: AdvancedSharedItem) => void;
  onItemDoubleClicked: (shareItem: AdvancedSharedItem) => void;
  selectedItems: AdvancedSharedItem[];
  onSelectedItemsChanged: (changes: { props: AdvancedSharedItem; value: boolean }[]) => void;
  orderBy?: { field: OrderField; direction: OrderDirection };
  sortBy: (value: { field: OrderField; direction: 'ASC' | 'DESC' }) => void;
  contextMenu: MenuItemType<AdvancedSharedItem>[];
};

export const PublicSharedItemList = ({
  shareItems,
  publicShareKey,
  isLoading,
  hasMoreItems,
  onNextPage,
  onClickItem,
  onItemDoubleClicked,
  selectedItems,
  onSelectedItemsChanged,
  orderBy,
  sortBy,
  contextMenu,
}: PublicSharedItemListProps) => {
  const itemComposition = (item: AdvancedSharedItem) => (
    <PublicSharedListItem item={item} publicShareKey={publicShareKey} onNameClicked={onItemDoubleClicked} />
  );

  const emptyStateElement = (
    <Empty
      icon={<img className="w-36" alt="" src={folderEmptyImage} />}
      title={t('views.recents.empty.folderEmpty')}
      subtitle={''}
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
          label: t('shared-links.list.size'),
          width: 'w-40',
          name: 'size',
          orderable: true,
          defaultDirection: 'ASC',
        },
      ]}
      items={shareItems}
      isLoading={isLoading}
      onClick={onClickItem}
      onDoubleClick={onItemDoubleClicked}
      itemComposition={[itemComposition]}
      skinSkeleton={skinSkeleton}
      emptyState={emptyStateElement}
      onNextPage={onNextPage}
      hasMoreItems={hasMoreItems}
      menu={contextMenu}
      displayMenuDiv
      selectedItems={selectedItems}
      keyboardShortcuts={['unselectAll', 'selectAll', 'multiselect']}
      onSelectedItemsChanged={onSelectedItemsChanged}
      orderBy={orderBy}
      onOrderByChanged={sortBy}
    />
  );
};

export default PublicSharedItemList;
