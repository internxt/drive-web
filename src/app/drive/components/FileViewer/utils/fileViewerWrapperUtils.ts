import {
  contextMenuDriveItemShared,
  contextMenuDriveItemSharedAFS,
  contextMenuDriveNotSharedLink,
  contextMenuTrashItems,
} from '../../DriveExplorer/DriveExplorerList/DriveItemContextMenu';
import { ListItemMenu } from 'app/shared/components/List/ListItem';
import { AdvancedSharedItem, PreviewFileItem } from 'app/share/types';
import { DriveItemData } from 'app/drive/types';
import { getAppConfig } from 'app/core/services/config.service';
import {
  canFileBeCached,
  getDatabaseFileSourceData,
  updateDatabaseFileSourceData,
} from 'app/drive/services/database.service';
import dateService from 'app/core/services/date.service';
import { DriveItemActions } from '../../DriveExplorer/DriveExplorerItem/hooks/useDriveItemActions';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

export type TopBarActionsMenu = ListItemMenu<DriveItemData> | ListItemMenu<AdvancedSharedItem>;

type PathProps = 'drive' | 'trash' | 'shared' | 'recents';

interface FileViewerShortcuts {
  renameItemFromKeyboard: ((item) => void) | undefined;
  removeItemFromKeyboard: ((item) => void) | undefined;
}

export const TopDropdownBarActionsMenu = ({
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

  const isSharedItem = (currentFile.sharings && currentFile.sharings?.length > 0) ?? false;
  const isOwner = currentFile.credentials?.user === user?.email;

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

  const driveActionsMenu = (): ListItemMenu<DriveItemData> => {
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

  const recentsActionsMenu = (): ListItemMenu<DriveItemData> => {
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

  const sharedActionsMenu = (): ListItemMenu<AdvancedSharedItem> => {
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

  const trashActionsMenu = (): ListItemMenu<DriveItemData> => {
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

export function getFileContentManager(currentFile, downloadFile, handleFileThumbnail) {
  const abortController = new AbortController();

  return {
    download: async (): Promise<Blob> => {
      const shouldFileBeCached = canFileBeCached(currentFile);

      const fileSource = await getDatabaseFileSourceData({ fileId: currentFile.id });
      const isCached = !!fileSource;
      let fileContent: Blob;

      if (isCached) {
        const isCacheExpired = !fileSource?.updatedAt
          ? true
          : dateService.isDateOneBefore({
              dateOne: fileSource?.updatedAt,
              dateTwo: currentFile?.updatedAt,
            });
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
          await handleFileThumbnail(currentFile, fileSource.source as File);
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

      return fileContent;
    },
    abort: () => {
      abortController.abort();
    },
  };
}

export const useFileViewerKeyboardShortcuts = ({
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
