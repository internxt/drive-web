import { Menu } from '@headlessui/react';
import { DriveItemData } from 'app/drive/types';
import useDriveItemActions from '../DriveExplorer/DriveExplorerItem/hooks/useDriveItemActions';
import {
  contextMenuDriveFolderNotSharedLink,
  contextMenuDriveFolderShared,
  contextMenuDriveItemShared,
  contextMenuDriveNotSharedLink,
} from '../DriveExplorer/DriveExplorerList/DriveItemContextMenu';
import { MenuItemType } from '@internxt/ui';

interface FileDropdownActionsProps {
  title?: string;
  item?: DriveItemData;
  openDropdown: boolean;
}

const FileDropdownActions = (props: FileDropdownActionsProps) => {
  const { title, item, openDropdown } = props;
  const isSharedItem = item?.sharings && item?.sharings?.length > 0;

  const {
    onCopyLinkButtonClicked,
    onMoveItemButtonClicked,
    onMoveToTrashButtonClicked,
    onShowDetailsButtonClicked,
    onDownloadItemButtonClicked,
    onLinkSettingsButtonClicked,
    onRenameItemButtonClicked,
    onOpenPreviewButtonClicked,
  } = useDriveItemActions(item as DriveItemData);

  const menuItemStyle = (active, disabled) => {
    let style = 'text-gray-80';
    if (active) {
      style = 'bg-gray-5 text-gray-100 dark:bg-gray-10';
    } else if (disabled) {
      style = 'pointer-events-none font-medium text-gray-100';
    }
    return style;
  };

  const menuItems = (): Array<MenuItemType<DriveItemData>> => {
    if (isSharedItem) {
      if (item?.isFolder) {
        return contextMenuDriveFolderShared({
          copyLink: onCopyLinkButtonClicked,
          openShareAccessSettings: onLinkSettingsButtonClicked,
          showDetails: onShowDetailsButtonClicked,
          renameItem: onRenameItemButtonClicked,
          moveItem: onMoveItemButtonClicked,
          downloadItem: onDownloadItemButtonClicked,
          moveToTrash: onMoveToTrashButtonClicked,
        });
      } else {
        return contextMenuDriveItemShared({
          openPreview: onOpenPreviewButtonClicked,
          showDetails: onShowDetailsButtonClicked,
          copyLink: onCopyLinkButtonClicked,
          openShareAccessSettings: onOpenPreviewButtonClicked,
          renameItem: onRenameItemButtonClicked,
          moveItem: onMoveItemButtonClicked,
          downloadItem: onDownloadItemButtonClicked,
          moveToTrash: onMoveToTrashButtonClicked,
        });
      }
    } else {
      if (item?.isFolder) {
        return contextMenuDriveFolderNotSharedLink({
          shareLink: onLinkSettingsButtonClicked,
          showDetails: onShowDetailsButtonClicked,
          getLink: onCopyLinkButtonClicked,
          renameItem: onRenameItemButtonClicked,
          moveItem: onMoveItemButtonClicked,
          downloadItem: onDownloadItemButtonClicked,
          moveToTrash: onMoveToTrashButtonClicked,
        });
      } else {
        return contextMenuDriveNotSharedLink({
          shareLink: onLinkSettingsButtonClicked,
          openPreview: onOpenPreviewButtonClicked,
          showDetails: onShowDetailsButtonClicked,
          getLink: onCopyLinkButtonClicked,
          renameItem: onRenameItemButtonClicked,
          moveItem: onMoveItemButtonClicked,
          downloadItem: onDownloadItemButtonClicked,
          moveToTrash: onMoveToTrashButtonClicked,
        });
      }
    }
  };

  return (
    <div className="z-20 flex flex-col rounded-lg bg-surface py-1.5 shadow-subtle-hard dark:bg-gray-5">
      {title ? <span className="mb-1 text-supporting-2">{title}</span> : null}
      {openDropdown && item && (
        <>
          {menuItems()?.map((option, i) => (
            <div key={i}>
              {option?.separator ? (
                <div className="my-0.5 flex w-full flex-row px-4">
                  <div className="h-px w-full bg-gray-10" />
                </div>
              ) : (
                option && (
                  <Menu.Item disabled={option.disabled?.(item)}>
                    {({ active, disabled }) => {
                      return (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            option.action?.(item);
                          }}
                          className={`flex w-full cursor-pointer flex-row whitespace-nowrap px-4 py-1.5 text-base ${menuItemStyle(
                            active,
                            disabled,
                          )}`}
                        >
                          <div className="flex flex-row items-center space-x-2">
                            {option.icon && <option.icon size={20} />}
                            <span>{option.name}</span>
                          </div>
                          <span className="ml-5 flex grow items-center justify-end text-sm text-gray-40">
                            {option.keyboardShortcutOptions?.keyboardShortcutIcon && (
                              <option.keyboardShortcutOptions.keyboardShortcutIcon size={14} />
                            )}
                            {option.keyboardShortcutOptions?.keyboardShortcutText ?? ''}
                          </span>
                        </button>
                      );
                    }}
                  </Menu.Item>
                )
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default FileDropdownActions;
