import { Dispatch, SetStateAction, useState } from 'react';
import { DriveItemData } from 'app/drive/types';
import { AppDispatch } from 'app/store';
import { backupsActions } from 'app/store/slices/backups';
import { PreviewFileItem } from 'app/share/types';
import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';

export const useBackupListActions = (
  onBreadcrumbFolderChanges: Dispatch<SetStateAction<DriveFolderData[]>>,
  dispatch: AppDispatch,
) => {
  const [folderUuid, setFolderUuid] = useState<string>();
  const [selectedItems, setSelectedItems] = useState<DriveItemData[]>([]);
  const [itemToPreview, setItemToPreview] = useState<PreviewFileItem>();
  const [isFileViewerOpen, setIsFileViewerOpen] = useState<boolean>(false);

  const onFolderUuidChanges = (folderUuid?: string) => {
    setFolderUuid(folderUuid);
  };

  const onCloseFileViewer = () => {
    setIsFileViewerOpen(false);
    setItemToPreview(undefined);
  };

  const onItemClicked = (item: DriveItemData) => {
    if (item.isFolder) {
      onBreadcrumbFolderChanges((current) => [...current, item]);
      dispatch(backupsActions.setCurrentFolder(item));
      setFolderUuid(item.uuid);
    } else {
      setItemToPreview(item);
      setIsFileViewerOpen(true);
    }
  };

  const onSelectedItemsChanged = (changes: { props: DriveItemData; value: boolean }[]) => {
    const selectedDevicesParsed = changes.map((change) => ({
      device: change.props,
      isSelected: change.value,
    }));
    onItemSelected(selectedDevicesParsed);
  };

  const onItemSelected = (changes: { device: DriveItemData; isSelected: boolean }[]) => {
    let updatedSelectedItems = selectedItems;

    for (const change of changes) {
      updatedSelectedItems = updatedSelectedItems.filter((item) => item.id !== change.device.id);
      if (change.isSelected) {
        updatedSelectedItems = [...updatedSelectedItems, change.device];
      }
    }
    setSelectedItems(updatedSelectedItems);
  };

  const clearSelectedItems = () => {
    setSelectedItems([]);
  };

  return {
    folderUuid,
    selectedItems,
    itemToPreview,
    isFileViewerOpen,
    onFolderUuidChanges,
    onCloseFileViewer,
    onItemClicked,
    onSelectedItemsChanged,
    onItemSelected,
    clearSelectedItems,
  };
};
