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
import analyticsService from 'app/analytics/services/analytics.service';

interface DriveItemActions {
  isEditingName: boolean;
  dirtyName: string;
  nameInputRef: RefObject<HTMLInputElement>;
  onRenameButtonClicked: (e: MouseEvent) => void;
  confirmNameChange: () => Promise<void>;
  onNameClicked: (e: MouseEvent) => void;
  onEditNameButtonClicked: (e: MouseEvent) => void;
  onNameBlurred: () => void;
  onNameChanged: (e: ChangeEvent<HTMLInputElement>) => void;
  onNameEnterKeyPressed: KeyboardEventHandler<HTMLInputElement>;
  onDownloadButtonClicked: (e: MouseEvent) => void;
  onShareButtonClicked: (e: MouseEvent) => void;
  onInfoButtonClicked: (e: MouseEvent) => void;
  onDeleteButtonClicked: (e: MouseEvent) => void;
  onItemClicked: (e: MouseEvent) => void;
  onItemDoubleClicked: (e: MouseEvent) => void;
  onItemRightClicked: (e: MouseEvent) => void;
}

const useDriveItemActions = (item: DriveItemData): DriveItemActions => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameEditPending, setNameEditPending] = useState(false);
  const [dirtyName, setDirtyName] = useState('');
  const [nameInputRef] = useState(createRef<HTMLInputElement>());
  const isItemSelected = useAppSelector(storageSelectors.isItemSelected);
  const currentFolderPath = useAppSelector(storageSelectors.currentFolderPath);
  const dispatch = useAppDispatch();
  const onRenameButtonClicked = (e: MouseEvent): void => {
    e.stopPropagation();

    setIsEditingName(true);
    setDirtyName(item.name);

    setTimeout(() => nameInputRef.current?.focus(), 0);
    analyticsService.rudderTrackClickedDriveActionsRenameButton(item.isFolder || false);
  };
  const confirmNameChange = async () => {
    if (nameEditPending) return;

    const metadata: DriveFileMetadataPayload | DriveFolderMetadataPayload = { itemName: dirtyName };
    if (item.name !== dirtyName) {
      setNameEditPending(true);
      await dispatch(storageThunks.updateItemMetadataThunk({ item, metadata }));
      setNameEditPending(false);
    }

    nameInputRef.current?.blur();
  };
  const onEditNameButtonClicked = (e: MouseEvent): void => {
    e.stopPropagation();
    e.preventDefault();

    setIsEditingName(true);
    setDirtyName(item.name);

    setTimeout(() => nameInputRef.current?.focus(), 0);
  };
  const onNameBlurred = (): void => {
    setIsEditingName(false);
  };
  const onNameChanged = (e: ChangeEvent<HTMLInputElement>): void => {
    setDirtyName(e.target.value);
  };
  const onNameEnterKeyPressed: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      confirmNameChange();
    }
  };

  const onDownloadButtonClicked = (e: MouseEvent): void => {
    e.stopPropagation();

    dispatch(storageThunks.downloadItemsThunk([item]));
    analyticsService.rudderTrackClickedDriveActionsDownloadButton(false, item.size, item.type, item.isFolder || false);
  };

  const onShareButtonClicked = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();

    dispatch(storageActions.setItemToShare(item));
    dispatch(uiActions.setIsShareItemDialogOpen(true));
    analyticsService.rudderTrackClickedDriveActionsShareButton(item.isFolder || false);
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
    analyticsService.rudderTrackClickedDriveActionsInfoButton(item.isFolder || false);

    e.stopPropagation();
  };
  const onDeleteButtonClicked = (e: React.MouseEvent): void => {
    e.stopPropagation();

    dispatch(storageActions.setItemsToDelete([item]));
    dispatch(uiActions.setIsDeleteItemsDialogOpen(true));
    analyticsService.rudderTrackClickedDriveActionsDeleteButton(item.isFolder || false);
  };
  const onItemClicked = (): void => {
    isItemSelected(item)
      ? dispatch(storageActions.deselectItems([item]))
      : dispatch(storageActions.selectItems([item]));
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

  return {
    isEditingName,
    dirtyName,
    nameInputRef,
    onRenameButtonClicked,
    confirmNameChange,
    onNameClicked,
    onEditNameButtonClicked,
    onNameBlurred,
    onNameChanged,
    onNameEnterKeyPressed,
    onDownloadButtonClicked,
    onShareButtonClicked,
    onInfoButtonClicked,
    onDeleteButtonClicked,
    onItemClicked,
    onItemDoubleClicked,
    onItemRightClicked,
  };
};

export default useDriveItemActions;
