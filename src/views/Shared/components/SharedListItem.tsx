import { Avatar } from '@internxt/ui';
import { AdvancedSharedItem } from '../../../app/share/types';
import usersIcon from '../../../assets/icons/users.svg';
import iconService from '../../../app/drive/services/icon.service';
import transformItemService from '../../../app/drive/services/item-transform.service';
import { items } from '@internxt/lib';
import { DriveItemData } from '../../../app/drive/types';
import dateService from 'services/date.service';
import sizeService from '../../../app/drive/services/size.service';

type SharedListItem = {
  onClickItem: (item) => void;
  item: AdvancedSharedItem;
  isItemSelected: boolean;
  onItemDoubleClicked: (shareItem: AdvancedSharedItem) => void;
  onNameClicked: (shareItem: AdvancedSharedItem) => void;
  getOwnerAvatarSrc: (shareItem: AdvancedSharedItem) => string | null;
  user?: AdvancedSharedItem['user'];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const SharedListItem = ({
  onClickItem,
  isItemSelected,
  item,
  user,
  onItemDoubleClicked,
  onNameClicked,
  getOwnerAvatarSrc,
}: SharedListItem) => {
  const ItemIconComponent = iconService.getItemIcon(item.isFolder, item.type);
  const selectedClassNames: string = isItemSelected ? 'selected' : '';

  return (
    <div
      role="none"
      onKeyDown={() => {}}
      className={`${selectedClassNames} file-list-item group`}
      onClick={() => onClickItem}
      onDoubleClick={() =>
        (item.isFolder && !item.deleted) || (!item.isFolder && item.status === 'EXISTS')
          ? onItemDoubleClicked
          : undefined
      }
      data-test={`file-list-${item.isFolder ? 'folder' : 'file'}`}
    >
      {/* ITEM NAME */}
      <div className="flex truncate whitespace-nowrap shrink-0 min-w-[200px] grow items-center pr-3">
        {/* ICON */}
        <div className="box-content flex items-center pr-4">
          <div className="relative flex h-10 w-10 justify-center drop-shadow-soft">
            <ItemIconComponent
              className="h-full"
              data-test={`file-list-${
                item.isFolder ? 'folder' : 'file'
              }-${transformItemService.getItemPlainNameWithExtension(item as unknown as DriveItemData)}`}
            />
            {item.dateShared && (
              <div className="absolute -bottom-0.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white ring-2 ring-surface">
                <img src={usersIcon} width={13} alt="shared users" />
              </div>
            )}
          </div>
        </div>

        {/* NAME */}
        <div className="flex w-[200px] grow cursor-pointer items-center truncate pr-2">
          <button
            data-test={`${item.isFolder ? 'folder' : 'file'}-name`}
            className="truncate"
            title={
              transformItemService.getItemPlainNameWithExtension(item as unknown as DriveItemData) ??
              items.getItemDisplayName(item)
            }
            onClick={(e) => {
              e.stopPropagation();
              onNameClicked(item);
            }}
          >
            <p className="truncate">
              {transformItemService.getItemPlainNameWithExtension(item as unknown as DriveItemData) ??
                items.getItemDisplayName(item)}
            </p>
          </button>
        </div>
      </div>

      {/* OWNER */}
      <div className="block  flex-row w-64 shrink-0 items-center whitespace-nowrap">
        <div className="flex flex-row gap-4 items-center">
          <div>
            <Avatar
              diameter={28}
              fullName={
                item.user?.name ? `${item.user?.name} ${item.user?.lastname}` : `${user?.name} ${user?.lastname}`
              }
              src={getOwnerAvatarSrc(item)}
            />
          </div>
          <span className={`${isItemSelected ? 'text-gray-100' : 'text-gray-60'}`}>
            {item.user ? (
              <span>{`${item.user?.name} ${item.user?.lastname}`}</span>
            ) : (
              <span>{`${user?.name} ${user?.lastname}`}</span>
            )}{' '}
          </span>
        </div>
      </div>

      {/* SIZE */}
      <div className="w-40  block shrink-0 items-center whitespace-nowrap">
        {sizeService.bytesToString(item.size, false) === '' || item.isFolder ? (
          <span className="opacity-25">—</span>
        ) : (
          sizeService.bytesToString(item.size, false)
        )}
      </div>

      {/* DATE */}
      <div className="block  shrink-0 w-40 items-center whitespace-nowrap">
        {dateService.format(item.createdAt, 'D MMM YYYY')}
      </div>
    </div>
  );
};
