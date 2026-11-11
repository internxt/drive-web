import { FileStatus } from '@internxt/sdk/dist/drive/storage/types';
import { MenuItemType } from '@internxt/ui';
import { DriveItemData } from 'app/drive/types';
import { PreviewFileItem } from 'app/share/types';
import {
  contextMenuDriveItemShared,
  contextMenuDriveNotSharedLink,
  contextMenuTrashItems,
} from 'views/Drive/components/DriveExplorer/components';
import { useDriveItemActions } from 'views/Drive/hooks';
import { FileViewerKeyboardShortcuts } from '../types';

interface UseFileViewerActionsProps {
  file: PreviewFileItem;
  onClose: () => void;
  contextMenu?: Array<MenuItemType<DriveItemData>>;
  keyboardShortcuts?: FileViewerKeyboardShortcuts;
}

export const useFileViewerActions = ({ file, onClose, contextMenu, keyboardShortcuts }: UseFileViewerActionsProps) => {
  const {
    onDownloadItemButtonClicked,
    onMoveItemButtonClicked,
    onCopyLinkButtonClicked,
    onShowDetailsButtonClicked,
    onLinkSettingsButtonClicked,
    onMoveToTrashButtonClicked,
    onRenameItemButtonClicked,
    onRestoreItemButtonClicked,
    onDeletePermanentlyButtonClicked,
  } = useDriveItemActions(file);

  const isTrashed = file.status === FileStatus.TRASHED;
  const isShared = (file.sharings?.length ?? 0) > 0;
  const hasViewOwnActions = !!contextMenu || !!keyboardShortcuts;

  const moveToTrashAndClose = () => {
    onMoveToTrashButtonClicked();
    onClose();
  };

  const getDriveMenuItems = (): Array<MenuItemType<DriveItemData>> => {
    const commonActions = {
      showDetails: onShowDetailsButtonClicked,
      renameItem: onRenameItemButtonClicked,
      moveItem: onMoveItemButtonClicked,
      downloadItem: onDownloadItemButtonClicked,
      moveToTrash: moveToTrashAndClose,
    };

    return isShared
      ? contextMenuDriveItemShared({
          ...commonActions,
          copyLink: onCopyLinkButtonClicked,
          openShareAccessSettings: onLinkSettingsButtonClicked,
        })
      : contextMenuDriveNotSharedLink({
          ...commonActions,
          shareLink: onLinkSettingsButtonClicked,
          getLink: onCopyLinkButtonClicked,
        });
  };

  const getMenuItems = (): Array<MenuItemType<DriveItemData>> => {
    if (contextMenu) return contextMenu;
    if (isTrashed) {
      return contextMenuTrashItems({
        restoreItem: onRestoreItemButtonClicked,
        deletePermanently: onDeletePermanentlyButtonClicked,
        showDetails: onShowDetailsButtonClicked,
      });
    }
    return getDriveMenuItems();
  };

  const getKeyboardShortcuts = (): FileViewerKeyboardShortcuts => {
    if (hasViewOwnActions) return keyboardShortcuts ?? {};
    if (isTrashed) return {};
    return { renameItemFromKeyboard: onRenameItemButtonClicked, removeItemFromKeyboard: moveToTrashAndClose };
  };

  return { menuItems: getMenuItems(), keyboardShortcuts: getKeyboardShortcuts() };
};
