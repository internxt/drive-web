import { DriveFileMetadataPayload, DriveFolderMetadataPayload, DriveItemData, DriveItemDetails } from 'app/drive/types';
import shareService from 'app/share/services/share.service';
import { storageActions, storageSelectors } from 'app/store/slices/storage';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import { uiActions } from 'app/store/slices/ui';
import { ChangeEvent, createRef, useCallback, useState } from 'react';
import moveItemsToTrash from 'use_cases/trash/move-items-to-trash';
import { ContextMenuDriveItem } from '../../DriveExplorerList/DriveExplorerList';
import { useAppSelector } from 'app/store/hooks';
import useDriveItemStoreProps from './useDriveStoreProps';
import { fetchSortedFolderContentThunk } from 'app/store/slices/storage/storage.thunks/fetchSortedFolderContentThunk';
import { getDatabaseFilePreviewData, updateDatabaseFilePreviewData } from 'app/drive/services/database.service';
import { downloadThumbnail, setCurrentThumbnail } from 'app/drive/services/thumbnail.service';
import { sessionSelectors } from 'app/store/slices/session/session.selectors';
import { sharedActions, sharedSelectors } from 'app/store/slices/sharedLinks';
import { RootState } from 'app/store';
import { UserRoles } from 'app/share/types';

const useDropdownActions = (dispatch) => {
  const { dirtyName } = useDriveItemStoreProps();
  const currentFolderId = useAppSelector(storageSelectors.currentFolderId);
  const [nameEditPending, setNameEditPending] = useState(false);
  const [nameInputRef] = useState(createRef<HTMLInputElement>());
  const isTeam = useAppSelector(sessionSelectors.isTeam);
  const currentUserRole = useAppSelector((state: RootState) => state.shared.currentSharingRole);

  const onRenameItemButtonClicked = (item: ContextMenuDriveItem) => {
    dispatch(storageActions.setItemToRename(item as DriveItemData));
    dispatch(uiActions.setIsEditFolderNameDialog(true));
  };

  const onMoveItemButtonClicked = (item: ContextMenuDriveItem) => {
    dispatch(storageActions.setItemsToMove([item as DriveItemData]));
    dispatch(uiActions.setIsMoveItemsDialogOpen(true));
  };

  const onRestoreItemButtonClicked = (item: ContextMenuDriveItem) => {
    dispatch(storageActions.setItemsToMove([item as DriveItemData]));
    dispatch(uiActions.setIsMoveItemsDialogOpen(true));
  };

  const onDeletePermanentlyButtonClicked = (item: ContextMenuDriveItem) => {
    dispatch(storageActions.setItemsToDelete([item as DriveItemData]));
    dispatch(uiActions.setIsDeleteItemsDialogOpen(true));
  };

  const onOpenPreviewButtonClicked = (item: ContextMenuDriveItem) => {
    dispatch(uiActions.setIsFileViewerOpen(true));
    dispatch(uiActions.setFileViewerItem(item as DriveItemData));
  };

  const onGetLinkButtonClicked = (item: ContextMenuDriveItem) => {
    const driveItem = item as DriveItemData;
    shareService.getPublicShareLink(driveItem.uuid as string, driveItem.isFolder ? 'folder' : 'file');
  };

  const onCopyLinkButtonClicked = (item: ContextMenuDriveItem) => {
    const driveItem = item as DriveItemData;
    shareService.getPublicShareLink(driveItem.uuid as string, driveItem.isFolder ? 'folder' : 'file');
  };

  const onShowDetailsButtonClicked = (item: ContextMenuDriveItem) => {
    const itemDetails: DriveItemDetails = {
      ...(item as DriveItemData),
      isShared: !!(item as any).sharings?.length,
      view: 'Drive',
    };
    dispatch(uiActions.setItemDetailsItem(itemDetails));
    dispatch(uiActions.setIsItemDetailsDialogOpen(true));
  };

  const onLinkSettingsButtonClicked = (item: ContextMenuDriveItem) => {
    dispatch(
      storageActions.setItemToShare({
        share: (item as DriveItemData)?.shares?.[0],
        item: item as DriveItemData,
      }),
    );
    dispatch(uiActions.setIsShareDialogOpen(true));
    // Use to share with specific user
    // dispatch(sharedThunks.shareFileWithUser({ email: 'email_of_user_to_share@example.com' }));
  };

  const onDownloadItemButtonClicked = async (item: ContextMenuDriveItem) => {
    dispatch(storageThunks.downloadItemsThunk([item as DriveItemData]));
  };

  const onMoveToTrashButtonClicked = (item: ContextMenuDriveItem) => {
    moveItemsToTrash([item as DriveItemData]);
  };

  const confirmNameChange = async (item) => {
    if (nameEditPending) return;

    const metadata: DriveFileMetadataPayload | DriveFolderMetadataPayload = { itemName: dirtyName };
    if (item.name !== dirtyName) {
      setNameEditPending(true);
      await dispatch(storageThunks.updateItemMetadataThunk({ item, metadata }));
      onNameBlurred();
      setNameEditPending(false);
      dispatch(storageActions.setHasMoreDriveFolders(true));
      dispatch(storageActions.setHasMoreDriveFiles(true));
      dispatch(fetchSortedFolderContentThunk(currentFolderId));
    }

    nameInputRef?.current?.blur();
  };

  const onNameChanged = (e: ChangeEvent<HTMLInputElement>): void => {
    dispatch(uiActions.setCurrentEditingNameDirty(e.target.value));
  };

  const onNameEnterKeyDown = (e, item) => {
    if (e.key === 'Enter') {
      confirmNameChange(item);
    } else if (e.key === 'Escape') {
      onNameBlurred();
    }
  };

  const onNameBlurred = (): void => {
    dispatch(uiActions.setCurrentEditingNameDirty(''));
    dispatch(uiActions.setCurrentEditingNameDriveItem(null));
  };

  const onItemClicked = (item): void => {
    dispatch(storageActions.clearSelectedItems());
    dispatch(storageActions.selectItems([item]));
  };

  const onItemDoubleClicked = (item): void => {
    if (item.isFolder) {
      dispatch(storageThunks.goToFolderThunk({ name: item.name, id: item.id }));
    } else {
      dispatch(uiActions.setIsFileViewerOpen(true));
      dispatch(uiActions.setFileViewerItem(item));
    }
  };

  const onNameClicked = (e: MouseEvent, item) => {
    e.stopPropagation();
    onItemDoubleClicked(item);
  };

  const downloadAndSetThumbnail = async (item) => {
    if (item.thumbnails && item.thumbnails.length > 0 && !item.currentThumbnail) {
      const databaseThumbnail = await getDatabaseFilePreviewData({ fileId: item.id });
      let thumbnailBlob = databaseThumbnail?.preview;
      const newThumbnail = item.thumbnails[0];

      if (!thumbnailBlob) {
        thumbnailBlob = await downloadThumbnail(newThumbnail, isTeam);
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

  const isCurrentUserViewer = useCallback(() => {
    return currentUserRole === UserRoles.Reader;
  }, [currentUserRole]);

  return {
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
    onNameChanged,
    onNameEnterKeyDown,
    isCurrentUserViewer,
  };
};

export default useDropdownActions;
