import { createRef, useMemo } from 'react';

import navigationService from 'app/core/services/navigation.service';
import moveItemsToTrash from 'use_cases/trash/move-items-to-trash';
import {
  getDatabaseFilePreviewData,
  updateDatabaseFilePreviewData,
} from '../../../../../drive/services/database.service';
import { downloadThumbnail, setCurrentThumbnail } from '../../../../../drive/services/thumbnail.service';
import { DriveItemData, DriveItemDetails } from '../../../../../drive/types';
import shareService from '../../../../../share/services/share.service';
import { useAppDispatch, useAppSelector } from '../../../../../store/hooks';
import { storageActions } from '../../../../../store/slices/storage';
import storageThunks from '../../../../../store/slices/storage/storage.thunks';
import { uiActions } from '../../../../../store/slices/ui';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';

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
  onShowDetailsButtonClicked: () => void;
  onMoveToTrashButtonClicked: () => void;
  onNameClicked: (e) => void;
  onItemClicked: () => void;
  onItemDoubleClicked: () => void;
  downloadAndSetThumbnail: () => void;
}

const useDriveItemActions = (item): DriveItemActions => {
  const dispatch = useAppDispatch();
  const nameInputRef = useMemo(() => createRef<HTMLInputElement>(), []);
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);
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
    shareService.getPublicShareLink(driveItem.uuid as string, driveItem.isFolder ? 'folder' : 'file');
  };

  const onCopyLinkButtonClicked = () => {
    const driveItem = item as DriveItemData;
    shareService.getPublicShareLink(driveItem.uuid as string, driveItem.isFolder ? 'folder' : 'file');
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
    dispatch(storageThunks.downloadItemsThunk([item as DriveItemData]));
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
    } else {
      if (isRecentsView) {
        dispatch(uiActions.setIsFileViewerOpen(true));
        dispatch(uiActions.setFileViewerItem(item));
      } else {
        navigationService.pushFile(item.uuid, selectedWorkspace?.workspaceUser.workspaceId);
      }
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
    onShowDetailsButtonClicked,
    onMoveToTrashButtonClicked,
    onNameClicked,
    onItemClicked,
    onItemDoubleClicked,
    downloadAndSetThumbnail,
  };
};

export default useDriveItemActions;
