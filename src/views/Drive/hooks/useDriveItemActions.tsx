import { createRef, useMemo } from 'react';

import navigationService from 'services/navigation.service';
import { moveItemsToTrash } from 'views/Trash/services';
import { getDatabaseFilePreviewData, updateDatabaseFilePreviewData } from 'app/drive/services/database.service';
import { downloadThumbnail, setCurrentThumbnail } from 'app/drive/services/thumbnail.service';
import { DriveItemData, DriveItemDetails } from 'app/drive/types';
import shareService from 'app/share/services/share.service';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { storageActions } from 'app/store/slices/storage';
import { uiActions } from 'app/store/slices/ui';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import { DownloadManager } from 'app/network/DownloadManager';

export interface DriveItemActions {
  nameInputRef: React.RefObject<HTMLInputElement>;
  onRenameItemButtonClicked: () => void;
  onMoveItemButtonClicked: () => void;
  onRestoreItemButtonClicked: () => void;
  onDeletePermanentlyButtonClicked: () => void;
  onOpenPreviewButtonClicked: () => void;
  onGetLinkButtonClicked: () => void;
  onCopyLinkButtonClicked: () => void;
  onLinkSettingsButtonClicked: () => void;
  onDownloadItemButtonClicked: () => void;
  onViewVersionHistoryButtonClicked: () => void;
  onShowDetailsButtonClicked: () => void;
  onMoveToTrashButtonClicked: () => void;
  onNameClicked: (e) => void;
  onItemClicked: () => void;
  onItemDoubleClicked: () => void;
  downloadAndSetThumbnail: () => Promise<void>;
}

const useDriveItemActions = (item): DriveItemActions => {
  const dispatch = useAppDispatch();
  const nameInputRef = useMemo(() => createRef<HTMLInputElement>(), []);
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const workspaceCredentials = useAppSelector(workspacesSelectors.getWorkspaceCredentials);
  const isWorkspace = !!selectedWorkspace;

  const onRenameItemButtonClicked = () => {
    dispatch(storageActions.setItemToRename(item as DriveItemData));
    dispatch(uiActions.setIsEditFolderNameDialog(true));
  };

  const onMoveItemButtonClicked = () => {
    dispatch(storageActions.setItemsToMove([item as DriveItemData]));
    dispatch(uiActions.setIsMoveItemsDialogOpen(true));
  };

  const onRestoreItemButtonClicked = () => {
    dispatch(storageActions.setItemsToMove([item as DriveItemData]));
    dispatch(uiActions.setIsMoveItemsDialogOpen(true));
  };

  const onDeletePermanentlyButtonClicked = () => {
    dispatch(storageActions.setItemsToDelete([item as DriveItemData]));
    dispatch(uiActions.setIsDeleteItemsDialogOpen(true));
  };

  const onOpenPreviewButtonClicked = () => {
    navigationService.pushFile(item.uuid, selectedWorkspace?.workspaceUser.workspaceId);
  };

  const onGetLinkButtonClicked = () => {
    const driveItem = item as DriveItemData;
    shareService.getPublicShareLink(driveItem.uuid, driveItem.isFolder ? 'folder' : 'file');
  };

  const onCopyLinkButtonClicked = () => {
    const driveItem = item as DriveItemData;
    shareService.getPublicShareLink(driveItem.uuid, driveItem.isFolder ? 'folder' : 'file');
  };

  const onShowDetailsButtonClicked = () => {
    const itemDetails: DriveItemDetails = {
      ...(item as DriveItemData),
      isShared: !!item.sharings?.length,
      view: 'Drive',
    };
    dispatch(uiActions.setItemDetailsItem(itemDetails));
    dispatch(uiActions.setIsItemDetailsDialogOpen(true));
  };

  const onLinkSettingsButtonClicked = () => {
    dispatch(
      storageActions.setItemToShare({
        share: (item as DriveItemData)?.shares?.[0],
        item: item as DriveItemData,
      }),
    );
    dispatch(uiActions.setIsShareDialogOpen(true));
  };

  const onDownloadItemButtonClicked = () => {
    DownloadManager.downloadItem({
      payload: [item as DriveItemData],
      selectedWorkspace,
      workspaceCredentials,
    });
  };

  const onViewVersionHistoryButtonClicked = () => {
    // TODO: Implement version history dialog
    console.log('View version history for item:', item);
  };

  const onMoveToTrashButtonClicked = () => {
    moveItemsToTrash([item as DriveItemData]);
  };

  const onItemClicked = (): void => {
    dispatch(storageActions.clearSelectedItems());
    dispatch(storageActions.selectItems([item]));
  };

  const onItemDoubleClicked = (): void => {
    const isRecentsView = navigationService.isCurrentPath('recents');

    if (item.isFolder) {
      dispatch(storageActions.setForceLoading(true));
      navigationService.pushFolder(item.uuid, selectedWorkspace?.workspaceUser.workspaceId);
    } else if (isRecentsView) {
      dispatch(uiActions.setFileViewerItem(item));
      dispatch(uiActions.setIsFileViewerOpen(true));
    } else {
      navigationService.pushFile(item.uuid, selectedWorkspace?.workspaceUser.workspaceId);
    }
  };

  const onNameClicked = (e) => {
    e.stopPropagation();
    onItemDoubleClicked();
  };

  const downloadAndSetThumbnail = async () => {
    if (item.thumbnails && item.thumbnails.length > 0 && !item.currentThumbnail) {
      const databaseThumbnail = await getDatabaseFilePreviewData({ fileId: item.id });
      let thumbnailBlob = databaseThumbnail?.preview;
      const newThumbnail = item.thumbnails[0];

      if (!thumbnailBlob) {
        thumbnailBlob = await downloadThumbnail(newThumbnail, isWorkspace);
        updateDatabaseFilePreviewData({
          fileId: item.id,
          folderId: item.folderId,
          previewBlob: thumbnailBlob,
          updatedAt: item.updatedAt,
        });
      }

      setCurrentThumbnail(thumbnailBlob, newThumbnail, item, dispatch);
    }
  };

  return {
    nameInputRef,
    onRenameItemButtonClicked,
    onMoveItemButtonClicked,
    onRestoreItemButtonClicked,
    onDeletePermanentlyButtonClicked,
    onOpenPreviewButtonClicked,
    onGetLinkButtonClicked,
    onCopyLinkButtonClicked,
    onLinkSettingsButtonClicked,
    onDownloadItemButtonClicked,
    onViewVersionHistoryButtonClicked,
    onShowDetailsButtonClicked,
    onMoveToTrashButtonClicked,
    onNameClicked,
    onItemClicked,
    onItemDoubleClicked,
    downloadAndSetThumbnail,
  };
};

export default useDriveItemActions;
