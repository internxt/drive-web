import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { getAppConfig } from 'services/config.service';
import { DriveItemData } from 'app/drive/types';
import { AdvancedSharedItem, PreviewFileItem } from 'app/share/types';
import type { DriveItemActions } from 'views/Drive/hooks';
import {
  contextMenuDriveItemShared,
  contextMenuDriveItemSharedAFS,
  contextMenuDriveNotSharedLink,
  contextMenuTrashItems,
} from 'views/Drive/components/DriveExplorer/components';
import { MenuItemType } from '@internxt/ui';
import { TopBarActionsMenu } from '../types';

type PathProps = 'drive' | 'trash' | 'shared' | 'recents';

interface FileViewerShortcuts {
  renameItemFromKeyboard: ((item) => void) | undefined;
  removeItemFromKeyboard: ((item) => void) | undefined;
}

const topDropdownBarActionsMenu = ({
  currentFile,
  user,
  onClose,
  onShowStopSharingDialog,
  driveItemActions,
  isCurrentUserViewer,
}: {
  currentFile: PreviewFileItem;
  user: UserSettings | null;
  onClose: () => void;
  onShowStopSharingDialog: (() => void) | undefined;
  driveItemActions: DriveItemActions;
  isCurrentUserViewer: () => boolean;
}): TopBarActionsMenu => {
  const path = getAppConfig().views.find((view) => view.path === location.pathname);
  const pathId = path?.id as PathProps;
  const isRecentsView = pathId === 'recents';
  const isSharedView = pathId === 'shared';
  const isTrashView = pathId === 'trash';

  const isSharedItem = (currentFile?.sharings && currentFile.sharings?.length > 0) ?? false;

  // TODO: QUICK FIX TO THE RELEASE
  // Check why the user field is networkUser in some cases instead of user
  // maybe needs backend changes
  const credentialsEmail = currentFile.credentials?.user ?? (currentFile.credentials as any)?.networkUser;
  const isOwner = credentialsEmail === user?.email;

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
  } = driveItemActions;

  const driveActionsMenu = (): Array<MenuItemType<DriveItemData>> => {
    if (isSharedItem) {
      return contextMenuDriveItemShared({
        copyLink: onCopyLinkButtonClicked,
        openShareAccessSettings: onLinkSettingsButtonClicked,
        showDetails: onShowDetailsButtonClicked,
        renameItem: onRenameItemButtonClicked,
        moveItem: onMoveItemButtonClicked,
        downloadItem: onDownloadItemButtonClicked,
        moveToTrash: () => {
          onMoveToTrashButtonClicked();
          onClose();
        },
      });
    } else {
      return contextMenuDriveNotSharedLink({
        shareLink: onLinkSettingsButtonClicked,
        getLink: onCopyLinkButtonClicked,
        renameItem: onRenameItemButtonClicked,
        showDetails: onShowDetailsButtonClicked,
        moveItem: onMoveItemButtonClicked,
        downloadItem: onDownloadItemButtonClicked,
        moveToTrash: () => {
          onMoveToTrashButtonClicked();
          onClose();
        },
      });
    }
  };

  const recentsActionsMenu = (): Array<MenuItemType<DriveItemData>> => {
    return contextMenuDriveNotSharedLink({
      shareLink: onLinkSettingsButtonClicked,
      getLink: onCopyLinkButtonClicked,
      renameItem: onRenameItemButtonClicked,
      moveItem: onMoveItemButtonClicked,
      showDetails: onShowDetailsButtonClicked,
      downloadItem: onDownloadItemButtonClicked,
      moveToTrash: () => {
        onMoveToTrashButtonClicked();
        onClose();
      },
    });
  };

  const sharedActionsMenu = (): Array<MenuItemType<AdvancedSharedItem>> => {
    return contextMenuDriveItemSharedAFS({
      openShareAccessSettings: isOwner ? onLinkSettingsButtonClicked : undefined,
      copyLink: onCopyLinkButtonClicked,
      showDetails: onShowDetailsButtonClicked,
      renameItem: !isCurrentUserViewer() ? onRenameItemButtonClicked : undefined,
      moveItem: isOwner ? onMoveItemButtonClicked : undefined,
      downloadItem: onDownloadItemButtonClicked,
      moveToTrash: isOwner ? onShowStopSharingDialog : undefined,
    });
  };

  const trashActionsMenu = (): Array<MenuItemType<DriveItemData>> => {
    return contextMenuTrashItems({
      restoreItem: onRestoreItemButtonClicked,
      deletePermanently: onDeletePermanentlyButtonClicked,
      showDetails: onShowDetailsButtonClicked,
    });
  };

  const contextMenuActions = () => {
    if (isRecentsView) {
      return recentsActionsMenu();
    } else if (isSharedView) {
      return sharedActionsMenu();
    } else if (isTrashView) {
      return trashActionsMenu();
    } else {
      return driveActionsMenu();
    }
  };

  return contextMenuActions();
};

const useFileViewerKeyboardShortcuts = ({
  sharedKeyboardShortcuts,
  driveItemActions,
  onClose,
}: {
  sharedKeyboardShortcuts?: {
    renameItemFromKeyboard?: (item) => void;
    removeItemFromKeyboard?: (item) => void;
  };
  driveItemActions: DriveItemActions;
  onClose: () => void;
}): FileViewerShortcuts => {
  if (sharedKeyboardShortcuts) {
    return {
      renameItemFromKeyboard: sharedKeyboardShortcuts.renameItemFromKeyboard,
      removeItemFromKeyboard: sharedKeyboardShortcuts.removeItemFromKeyboard,
    };
  }

  return {
    renameItemFromKeyboard: driveItemActions.onRenameItemButtonClicked,
    removeItemFromKeyboard: () => {
      driveItemActions.onMoveToTrashButtonClicked();
      onClose();
    },
  };
};

export { topDropdownBarActionsMenu, useFileViewerKeyboardShortcuts };
