import { DriveItemData } from 'app/drive/types';
import { MenuItemType } from '@internxt/ui';
import useDriveItemActions from '../../hooks/useDriveItemActions';
import {
  contextMenuDriveFolderNotSharedLink,
  contextMenuDriveFolderShared,
  contextMenuDriveItemShared,
  contextMenuDriveNotSharedLink,
} from '../../../DriveExplorerList/DriveItemContextMenu';

export function fileDropdownActions(item?: DriveItemData) {
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

  return menuItems();
}
