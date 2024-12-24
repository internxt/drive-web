import { useMemo } from 'react';
import {
  contextMenuDriveFolderSharedAFS,
  contextMenuDriveItemSharedAFS,
  contextMenuMultipleSharedViewAFS,
} from '../../../../drive/components/DriveExplorer/DriveExplorerList/DriveItemContextMenu';
import { AdvancedSharedItem } from '../../../types';

interface SharedContextMenuActions {
  downloadItem: (item: AdvancedSharedItem) => Promise<void>;
  onOpenStopSharingDialog: () => void;
  copyLink: (item: AdvancedSharedItem) => void;
  openShareAccessSettings: (item: AdvancedSharedItem) => void;
  showDetails: (item: AdvancedSharedItem) => void;
  renameItem: (item: AdvancedSharedItem) => void;
  moveItem: (item: AdvancedSharedItem) => void;
  openPreview: (item: AdvancedSharedItem) => void;
}

interface SharedContextMenuProps {
  selectedItems: AdvancedSharedItem[];
  sharedContextMenuActions: SharedContextMenuActions;
  isItemsOwnedByCurrentUser: boolean;
  isRootFolder?: boolean;
  isItemOwnedByCurrentUser: (userUUID: string | undefined) => boolean;
  isCurrentUserViewer: boolean;
}

const useSharedContextMenu = ({
  selectedItems,
  sharedContextMenuActions: {
    downloadItem,
    onOpenStopSharingDialog,
    copyLink,
    openShareAccessSettings,
    showDetails,
    renameItem,
    moveItem,
    openPreview,
  },
  isItemsOwnedByCurrentUser,
  isItemOwnedByCurrentUser,
  isRootFolder,
  isCurrentUserViewer,
}: SharedContextMenuProps) => {
  const menu = useMemo(() => {
    const getMultipleItemsContextMenu = () => {
      return contextMenuMultipleSharedViewAFS({
        downloadItem,
        moveToTrash: isItemsOwnedByCurrentUser ? onOpenStopSharingDialog : undefined,
      });
    };

    const getFolderContextMenu = (folder: AdvancedSharedItem) => {
      const userUUID = folder?.user?.uuid;
      const isEditorUser = !isCurrentUserViewer;
      const canHandleShareAccessSettings = isRootFolder && (isItemOwnedByCurrentUser(userUUID) || !isCurrentUserViewer);

      const ownerCurrentUserOptions = isItemOwnedByCurrentUser(userUUID)
        ? {
            openShareAccessSettings: canHandleShareAccessSettings ? openShareAccessSettings : undefined,
            renameItem: renameItem,
            moveItem: moveItem,
            moveToTrash: onOpenStopSharingDialog,
          }
        : undefined;

      return contextMenuDriveFolderSharedAFS({
        copyLink,
        showDetails,
        downloadItem,
        renameItem: isEditorUser ? renameItem : undefined,
        ...ownerCurrentUserOptions,
      });
    };

    const getItemContextMenu = (item: AdvancedSharedItem) => {
      const userUUID = item?.user?.uuid;
      const isEditorUser = !isCurrentUserViewer;
      const canHandleShareAccessSettings = isRootFolder && (isItemOwnedByCurrentUser(userUUID) || !isCurrentUserViewer);

      const ownerCurrentUserOptions = isItemOwnedByCurrentUser(userUUID)
        ? {
            openShareAccessSettings: canHandleShareAccessSettings ? openShareAccessSettings : undefined,
            renameItem: renameItem,
            moveItem: moveItem,
            moveToTrash: onOpenStopSharingDialog,
          }
        : undefined;

      const handleDownload = (item: AdvancedSharedItem) => {
        downloadItem(item);
      };

      return contextMenuDriveItemSharedAFS({
        openPreview,
        showDetails,
        copyLink,
        downloadItem: handleDownload,
        renameItem: isEditorUser ? renameItem : undefined,
        ...ownerCurrentUserOptions,
      });
    };

    if (selectedItems.length > 1) {
      return getMultipleItemsContextMenu();
    }

    const selectedItem = selectedItems[0];

    if (!selectedItem) {
      return;
    }

    if (selectedItem.isFolder) {
      return getFolderContextMenu(selectedItem);
    }

    return getItemContextMenu(selectedItem);
  }, [
    selectedItems,
    downloadItem,
    onOpenStopSharingDialog,
    copyLink,
    openShareAccessSettings,
    showDetails,
    renameItem,
    moveItem,
    openPreview,
    isItemsOwnedByCurrentUser,
    isItemOwnedByCurrentUser,
    isCurrentUserViewer,
    isRootFolder,
  ]);

  return menu;
};

export default useSharedContextMenu;
