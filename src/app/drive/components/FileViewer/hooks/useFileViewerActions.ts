import { useMemo, useRef } from 'react';
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
  const driveItemActions = useDriveItemActions(file);
  const latestActions = useRef({ ...driveItemActions, onClose });
  latestActions.current = { ...driveItemActions, onClose };

  const isTrashed = file.status === FileStatus.TRASHED;
  const isShared = (file.sharings?.length ?? 0) > 0;
  const hasViewOwnActions = !!contextMenu || !!keyboardShortcuts;

  const actions = useMemo(
    () => ({
      download: () => latestActions.current.onDownloadItemButtonClicked(),
      move: () => latestActions.current.onMoveItemButtonClicked(),
      copyLink: () => latestActions.current.onCopyLinkButtonClicked(),
      showDetails: () => latestActions.current.onShowDetailsButtonClicked(),
      openLinkSettings: () => latestActions.current.onLinkSettingsButtonClicked(),
      rename: () => latestActions.current.onRenameItemButtonClicked(),
      restore: () => latestActions.current.onRestoreItemButtonClicked(),
      deletePermanently: () => latestActions.current.onDeletePermanentlyButtonClicked(),
      moveToTrashAndClose: () => {
        latestActions.current.onMoveToTrashButtonClicked();
        latestActions.current.onClose();
      },
    }),
    [],
  );

  const menuItems = useMemo((): Array<MenuItemType<DriveItemData>> => {
    if (contextMenu) return contextMenu;
    if (isTrashed) {
      return contextMenuTrashItems({
        restoreItem: actions.restore,
        deletePermanently: actions.deletePermanently,
        showDetails: actions.showDetails,
      });
    }

    const commonActions = {
      showDetails: actions.showDetails,
      renameItem: actions.rename,
      moveItem: actions.move,
      downloadItem: actions.download,
      moveToTrash: actions.moveToTrashAndClose,
    };

    return isShared
      ? contextMenuDriveItemShared({
          ...commonActions,
          copyLink: actions.copyLink,
          openShareAccessSettings: actions.openLinkSettings,
        })
      : contextMenuDriveNotSharedLink({
          ...commonActions,
          shareLink: actions.openLinkSettings,
          getLink: actions.copyLink,
        });
  }, [actions, contextMenu, isTrashed, isShared]);

  const viewerKeyboardShortcuts = useMemo((): FileViewerKeyboardShortcuts => {
    if (hasViewOwnActions) return keyboardShortcuts ?? {};
    if (isTrashed) return {};
    return { renameItemFromKeyboard: actions.rename, removeItemFromKeyboard: actions.moveToTrashAndClose };
  }, [actions, hasViewOwnActions, keyboardShortcuts, isTrashed]);

  return { menuItems, keyboardShortcuts: viewerKeyboardShortcuts };
};
