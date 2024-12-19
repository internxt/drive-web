import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { getAppConfig } from 'app/core/services/config.service';
import dateService from 'app/core/services/date.service';
import {
  canFileBeCached,
  getDatabaseFileSourceData,
  updateDatabaseFileSourceData,
} from 'app/drive/services/database.service';
import { DriveItemData } from 'app/drive/types';
import { AdvancedSharedItem, PreviewFileItem } from 'app/share/types';
import { DriveItemActions } from '../../DriveExplorer/DriveExplorerItem/hooks/useDriveItemActions';
import {
  contextMenuDriveItemShared,
  contextMenuDriveItemSharedAFS,
  contextMenuDriveNotSharedLink,
  contextMenuTrashItems,
} from '../../DriveExplorer/DriveExplorerList/DriveItemContextMenu';
import { MenuItemType } from '@internxt/ui';

interface DownloadedBlobData {
  blob: Blob;
  shouldHandleFileThumbnail: boolean;
}

export type TopBarActionsMenu = Array<MenuItemType<DriveItemData>> | Array<MenuItemType<AdvancedSharedItem>>;

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

function getFileContentManager(currentFile, downloadFile) {
  const abortController = new AbortController();

  return {
    download: async (): Promise<DownloadedBlobData> => {
      let fileContent: Blob;

      const fileSource = await getDatabaseFileSourceData({ fileId: currentFile.id });

      const shouldFileBeCached = canFileBeCached(currentFile);
      const isCached = !!fileSource;
      const isCacheExpired = !fileSource?.updatedAt
        ? true
        : dateService.isDateOneBefore({
            dateOne: fileSource?.updatedAt,
            dateTwo: currentFile?.updatedAt,
          });

      const shouldHandleFileThumbnail = !isCached || isCacheExpired;

      if (isCached) {
        if (isCacheExpired) {
          fileContent = await downloadFile(currentFile, abortController);
          await updateDatabaseFileSourceData({
            folderId: currentFile.folderId,
            sourceBlob: fileContent,
            fileId: currentFile.id,
            updatedAt: currentFile.updatedAt,
          });
        } else {
          fileContent = fileSource.source as Blob;
        }
      } else {
        fileContent = await downloadFile(currentFile, abortController);
        if (shouldFileBeCached) {
          await updateDatabaseFileSourceData({
            folderId: currentFile.folderId,
            sourceBlob: fileContent,
            fileId: currentFile.id,
            updatedAt: currentFile.updatedAt,
          });
        }
      }

      return { blob: fileContent, shouldHandleFileThumbnail };
    },
    abort: () => {
      abortController.abort();
    },
  };
}

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

export { getFileContentManager, topDropdownBarActionsMenu, useFileViewerKeyboardShortcuts };
