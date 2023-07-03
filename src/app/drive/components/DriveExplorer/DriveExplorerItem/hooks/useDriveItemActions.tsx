import { items } from '@internxt/lib';

import { MouseEvent, ChangeEvent, createRef, KeyboardEventHandler, RefObject, useState } from 'react';
import { DriveFileMetadataPayload, DriveFolderMetadataPayload, DriveItemData } from '../../../../types';
import dateService from '../../../../../core/services/date.service';
import iconService from '../../../../services/icon.service';
import sizeService from '../../../../../drive/services/size.service';
import { useAppDispatch, useAppSelector } from '../../../../../store/hooks';
import { storageActions } from '../../../../../store/slices/storage';
import storageSelectors from '../../../../../store/slices/storage/storage.selectors';
import storageThunks from '../../../../../store/slices/storage/storage.thunks';
import { uiActions } from '../../../../../store/slices/ui';
import useDriveItemStoreProps from './useDriveStoreProps';
import { sessionSelectors } from 'app/store/slices/session/session.selectors';
import { downloadThumbnail, setCurrentThumbnail } from 'app/drive/services/thumbnail.service';
import { sharedThunks } from 'app/store/slices/sharedLinks';
import moveItemsToTrash from '../../../../../../use_cases/trash/move-items-to-trash';
import { getDatabaseFilePrewiewData, updateDatabaseFilePrewiewData } from '../../../../services/database.service';
import { fetchSortedFolderContentThunk } from 'app/store/slices/storage/storage.thunks/fetchSortedFolderContentThunk';

interface DriveItemActions {
  nameInputRef: RefObject<HTMLInputElement>;
  onRenameButtonClicked: (e: MouseEvent) => void;
  confirmNameChange: () => Promise<void>;
  onNameClicked: (e: MouseEvent) => void;
  onEditNameButtonClicked: (e: MouseEvent) => void;
  onNameBlurred: () => void;
  onNameChanged: (e: ChangeEvent<HTMLInputElement>) => void;
  onNameEnterKeyDown: KeyboardEventHandler<HTMLInputElement>;
  onDownloadButtonClicked: (e: MouseEvent) => void;
  onShareButtonClicked: (e: MouseEvent) => void;
  onShareCopyButtonClicked: (e: MouseEvent) => void;
  onShareSettingsButtonClicked: (e: MouseEvent) => void;
  onShareDeleteButtonClicked: (e: MouseEvent) => void;
  onInfoButtonClicked: (e: MouseEvent) => void;
  onDeleteButtonClicked: (e: MouseEvent) => void;
  onDeletePermanentlyButtonClicked: (e: MouseEvent) => void;
  onRecoverButtonClicked: (e: MouseEvent) => void;
  onItemClicked: (e: MouseEvent) => void;
  onItemDoubleClicked: (e: MouseEvent) => void;
  onItemRightClicked: (e: MouseEvent) => void;
  downloadAndSetThumbnail: () => void;
}

const useDriveItemActions = (item: DriveItemData): DriveItemActions => {
  const dispatch = useAppDispatch();
  const [nameEditPending, setNameEditPending] = useState(false);
  const [nameInputRef] = useState(createRef<HTMLInputElement>());
  const currentFolderPath = useAppSelector(storageSelectors.currentFolderPath);
  const isTeam = useAppSelector(sessionSelectors.isTeam);
  const { dirtyName } = useDriveItemStoreProps();
  const currentFolderId = useAppSelector(storageSelectors.currentFolderId);

  const onRenameButtonClicked = (e: MouseEvent): void => {
    e.stopPropagation();
    dispatch(uiActions.setCurrentEditingNameDirty(item.name));
    dispatch(uiActions.setCurrentEditingNameDriveItem(item));
  };

  const confirmNameChange = async () => {
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

  const onEditNameButtonClicked = (e: MouseEvent): void => {
    e.stopPropagation();
    e.preventDefault();

    dispatch(uiActions.setCurrentEditingNameDirty(item.name));
    dispatch(uiActions.setCurrentEditingNameDriveItem(item));
  };

  const onNameBlurred = (): void => {
    dispatch(uiActions.setCurrentEditingNameDirty(''));
    dispatch(uiActions.setCurrentEditingNameDriveItem(null));
  };

  const onNameChanged = (e: ChangeEvent<HTMLInputElement>): void => {
    dispatch(uiActions.setCurrentEditingNameDirty(e.target.value));
  };

  const onNameEnterKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      confirmNameChange();
    } else if (e.key === 'Escape') {
      onNameBlurred();
    }
  };

  const onDownloadButtonClicked = (e: MouseEvent): void => {
    e.stopPropagation();

    dispatch(storageThunks.downloadItemsThunk([item]));
  };

  const onShareButtonClicked = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    dispatch(sharedThunks.getSharedLinkThunk({ item }));
  };

  const onShareCopyButtonClicked = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    dispatch(sharedThunks.getSharedLinkThunk({ item }));
  };

  const onShareSettingsButtonClicked = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    dispatch(storageActions.setItemToShare({ share: item?.shares?.[0], item }));
    dispatch(uiActions.setIsShareItemDialogOpen(true));
  };

  const onShareDeleteButtonClicked = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    dispatch(sharedThunks.deleteLinkThunk({ linkId: item?.shares?.[0]?.id as string, item }));
  };

  const onInfoButtonClicked = (e: React.MouseEvent): void => {
    const itemDisplayName = items.getItemDisplayName(item);
    const itemFullPath = `${currentFolderPath}${itemDisplayName}`;
    const infoMenuFeatures = [
      {
        label: 'Folder path',
        value: itemFullPath,
      },
      {
        label: 'Type',
        value: item.type,
      },
      {
        label: 'Size',
        value: sizeService.bytesToString(item.size, false),
      },
      {
        label: 'Modified',
        value: dateService.format(item.updatedAt, 'DD MMMM YYYY'),
      },
      {
        label: 'Created',
        value: dateService.format(item.createdAt, 'DD MMMM YYYY'),
      },
    ];

    dispatch(
      uiActions.setFileInfoItem({
        id: `drive-item-${item.id}`,
        icon: iconService.getItemIcon(item.isFolder, item.type),
        title: itemDisplayName,
        features: infoMenuFeatures,
      }),
    );
    dispatch(uiActions.setIsDriveItemInfoMenuOpen(true));

    e.stopPropagation();
  };

  const onDeleteButtonClicked = (e: React.MouseEvent): void => {
    e.stopPropagation();
    moveItemsToTrash([item]);
  };

  const onDeletePermanentlyButtonClicked = (e: React.MouseEvent): void => {
    e.stopPropagation();

    dispatch(storageActions.setItemsToDelete([item]));
    dispatch(uiActions.setIsDeleteItemsDialogOpen(true));
  };

  const onRecoverButtonClicked = (e: React.MouseEvent): void => {
    e.stopPropagation();
    dispatch(storageActions.setItemsToMove([item]));
    dispatch(uiActions.setIsMoveItemsDialogOpen(true));
  };

  const onItemClicked = (): void => {
    dispatch(storageActions.clearSelectedItems());
    dispatch(storageActions.selectItems([item]));
  };

  const onItemDoubleClicked = (): void => {
    if (item.isFolder) {
      dispatch(storageThunks.goToFolderThunk({ name: item.name, id: item.id }));
    } else {
      dispatch(uiActions.setIsFileViewerOpen(true));
      dispatch(uiActions.setFileViewerItem(item));
    }
  };

  const onNameClicked = (e: MouseEvent) => {
    e.stopPropagation();
    onItemDoubleClicked();
  };

  const onItemRightClicked = (e: React.MouseEvent): void => {
    e.preventDefault();
  };

  const downloadAndSetThumbnail = async () => {
    if (item.thumbnails && item.thumbnails.length > 0 && !item.currentThumbnail) {
      const databaseThumbnail = await getDatabaseFilePrewiewData({ fileId: item.id });
      let thumbnailBlob = databaseThumbnail?.preview;
      const newThumbnail = item.thumbnails[0];

      if (!thumbnailBlob) {
        thumbnailBlob = await downloadThumbnail(newThumbnail, isTeam);
        updateDatabaseFilePrewiewData({
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
    onRenameButtonClicked,
    confirmNameChange,
    onNameClicked,
    onEditNameButtonClicked,
    onNameBlurred,
    onNameChanged,
    onNameEnterKeyDown,
    onDownloadButtonClicked,
    onShareButtonClicked,
    onShareCopyButtonClicked,
    onShareSettingsButtonClicked,
    onShareDeleteButtonClicked,
    onInfoButtonClicked,
    onDeleteButtonClicked,
    onDeletePermanentlyButtonClicked,
    onRecoverButtonClicked,
    onItemClicked,
    onItemDoubleClicked,
    onItemRightClicked,
    downloadAndSetThumbnail,
  };
};

export default useDriveItemActions;
